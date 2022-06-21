// Import utilities
import _ from 'underscore';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest, cancelRestRequests } from '@girder/core/rest';
import compareVersions from 'compare-versions';
import events from '@girder/core/events';
import FolderModel from '@girder/core/models/FolderModel';
import ApiKeyCollection from '@girder/core/collections/ApiKeyCollection.js'
import ApiKeyModel from '@girder/core/models/ApiKeyModel.js'
import FolderCollection from '@girder/core/collections/FolderCollection';
import { VIP_PLUGIN_API_KEY, NEEDED_TOKEN_SCOPES } from '../constants';
import CarminClient from '../vendor/carmin/carmin-client';


// general utils

function messageGirder (type, text, duration = 5000) {
  events.trigger('g:alert', {
    text: text,
    type: type,
    duration: duration
  });
}

function fetchGirderFolders(model, level=0) {
  var children = new FolderCollection();

  return children.fetch({
      parentType: model.resourceName,
      parentId: model.id
  })
  .then( function() {return this;}.bind(children))
  .then(children =>
    Promise.all( children.map(child => fetchGirderFolders(child, level+1)) )
  ).then(
    childrenWithFolders => { return {
      model : model,
      level : level,
      children : _.sortBy(childrenWithFolders, child => child.model.get('name'))
    };
  });
}

var vipConfig = null;

function getVipConfig() {
  if (vipConfig) return Promise.resolve(vipConfig);

  return restRequest({
    method: 'GET',
    url: '/system/setting/vip_plugin'
  })
  .then(resp => {
    vipConfig = resp;
    return vipConfig;
  });
}

function useVipConfig(promise, f) {
    return Promise.all([
      getVipConfig(),
      promise,
    ])
    .then( res => f.apply(this, res) );
}

// VIP api use in plugin

function hasTheVipApiKeyConfigured() {
  var currentUser = getCurrentUser()
  return currentUser !== null
    && currentUser.get('apiKeyVip') !== undefined
    && currentUser.get('apiKeyVip').length != 0;
}

function isPluginActivatedOn(model) {
  if (model.resourceName === 'user') {
    return Promise.resolve(false);
  }
  if (model.resourceName === 'collection') {
    return isPluginActivatedOnCollection(model.id);
  }
  if (_.contains(['item', 'folder'], model.resourceName)) {
    if (model.get('baseParentType') === 'user') {
      return isPluginActivatedOnUserModel(model.get('baseParentId'), model);
    } else if (model.get('baseParentType') !== 'collection') {
      return Promise.resolve(false);
    }
    return isPluginActivatedOnCollection(model.get('baseParentId'));
  }
}

function isPluginActivatedOnUserModel(userId, model) {
  if (userId !== getCurrentUser().id) return Promise.resolve(false);
  if (model.resourceName === 'folder') {
    return Promise.resolve( ! model.get('public'));
  }
  if (model.resourceName === 'item') {
    var folder = new FolderModel({ _id: model.get('folderId') });
    return folder.fetch().then(() => ! folder.get('public'));
  }
  // what is it ???
  return Promise.resolve(false);
}

function isPluginActivatedOnCollection(collectionId) {
  return getVipConfig().then(
    vipConfig => _.contains(vipConfig.authorized_collections, collectionId)
  );
}

function saveVipApiKey(newkey) {
  return restRequest({
    method: 'PUT',
    url: '/user/' + getCurrentUser().id + '/apiKeyVip',
    data: {
      apiKeyVip: newkey
    }
  })
  .then(() => {
    getCurrentUser().set('apiKeyVip', newkey);
    messageGirder("success", "Your VIP configuration has been updated");
    events.trigger('vip:vipApiKeyChanged', {apiKeyVip: newkey});
  });
}

// key config stuff

const ERRORS = {
  VIP_API_KEY_NOT_CONFIGURED : 'You must configure your VIP API key in your girder account',
  WRONG_VIP_API_KEY : 'Your VIP API key is wrong, please update it in your account',
  NO_KEY_CONFIGURED_IN_VIP : 'No girder API key configured in VIP',
  GIRDER_NOT_CONFIGURED_IN_VIP : 'This girder platform is not configured in VIP. Please contact administrators',
  SEVERAL_GIRDER_KEY : 'You have several Girder API keys for VIP',
  GIRDER_KEY_NOT_FOUND : 'No Girder API key configured for VIP with this value',
  NO_GIRDER_KEY : 'No Girder API keys configured for VIP',
  GIRDER_KEY_NOT_ACTIVE : 'Your Girder API key for VIP is not active',
  GIRDER_KEY_TOKEN_TOO_LONG : 'Your Girder API key for VIP allows for long-lived tokens',
  GIRDER_KEY_MISSING_RIGHTS : 'Your Girder API key for VIP does not have enough rights'
};

const NOT_RECOVERABLE_ERRORS = [
  'VIP_API_KEY_NOT_CONFIGURED',
  'WRONG_VIP_API_KEY',
  'GIRDER_NOT_CONFIGURED_IN_VIP'
];

// return a promise
// if not OK but recoverable, recover and (printWarning option) print a warning
// if not ok and not recoverable, throw the error message
function updateApiKeysConfiguration(opts) {

    return (opts.newKey ? getCarminClient(opts.newKey) : Promise.resolve())
    // test vip config and api key
    .then( () => verifyVipConfig() )
    .then( () => verifyGirderApiKey({
      onlyCheck : false,
      printWarning : opts.printWarning,
      pushOnVip : true,
      firstTime : true,
      keysCollection : opts.keysCollection
    }))
    .catch(error => {
      // deal with vip api error
      if (error.vipPluginError) {
        if (_.contains(NOT_RECOVERABLE_ERRORS, error.vipPluginError)) {
          throw ERRORS[error.vipPluginError];
        } else {
          // already logged
          return false;
        }
      } else {
        throw 'Unexpected VIP plugin error : ' + error;
      }
    });
}

// return a promise with a boolean if it's OK
// if not OK but recoverable, return false and (printWarning option) print a warning
// if not ok and not recoverable, throw the error message
function verifyApiKeysConfiguration(opts) {

  // test if vip key is configured
  if (! hasTheVipApiKeyConfigured()) {
    return Promise.reject(ERRORS.VIP_API_KEY_NOT_CONFIGURED);
  }

  // test it is valid (by fetching external keys)
  var getKeys = doVipRequest('listUserExternalPlatformKeys');
  // test there is a girder key in there
  return useVipConfig(getKeys, (vipConfig, userVipKeys) =>
    _.findWhere(userVipKeys, {storageIdentifier : vipConfig.vip_external_storage_name})
  )
  // verify it is ok
  .then(vipKeyForGirder => {
    if ( vipKeyForGirder) {
      // test that key exist in girder and is valid
      return verifyGirderApiKey({
        onlyCheck : true,
        printWarning : opts.printWarning,
        keyValue : vipKeyForGirder.apiKey,
        pushOnVip : false,
        keysCollection : opts.keysCollection
      });
    }
    // problem : girder non configured in vip or girder key not configured
    return verifyVipConfig()
    .then( () => {
      if ( opts.printWarning) {
        messageGirder("warning", ERRORS.NO_KEY_CONFIGURED_IN_VIP);
      }
      throw { vipPluginError : 'NO_KEY_CONFIGURED_IN_VIP' };
    });
  })
  .then( () => true)
  .catch(error => {
    // deal with vip api error
    if (error.vipPluginError) {
      if (_.contains(NOT_RECOVERABLE_ERRORS, error.vipPluginError)) {
        throw ERRORS[error.vipPluginError];
      } else {
        // already logged
        return false;
      }
    } else {
      throw 'Unexpected VIP plugin error : ' + error;
    }
  });
}

// internal key stuff

/*
  opts :
  onlyCheck
  firstTime
  printWarning

  keysCollection
  keyValue

  pushOnVip
*/
function verifyGirderApiKey(opts = {}) {
  var onWarningFunction = (errorCode) => {
    if (opts.printWarning) {
      messageGirder("warning", ERRORS[errorCode]);
    }
    if (opts.onlyCheck) {
      throw { vipPluginError : errorCode };
    }
  }

  return fetchGirderApiKeysForVip({keysCollection : opts.keysCollection})
  .then( (girderApiKeysForVip) => {
    if (opts.keyValue) {
      return _.find(girderApiKeysForVip, key => key.get('key') == opts.keyValue);
    }
    if (girderApiKeysForVip.length > 1) {
      onWarningFunction('SEVERAL_GIRDER_KEY');
      return deleteApiKeys(girderApiKeysForVip);
    }
    return girderApiKeysForVip.length ? girderApiKeysForVip.pop() : null;
  })
  // if it exists, check it
  .then( apikey => {
    // check if is ok
    if (! apikey) {
      if (opts.keyValue)
        onWarningFunction('GIRDER_KEY_NOT_FOUND');
      else if (! opts.firstTime)
        onWarningFunction('NO_GIRDER_KEY');
      return undefined;
    }
    if ( ! isGirderApiKeyOk(apikey, {
      onError : onWarningFunction
    })) {
      return deleteApiKeys(apikey);
    }
    return apikey;
  })
  // create it if necessary
  .then( apikey => createAndPushGirderApiKey({
      doPush : opts.pushOnVip,
      apikey  : apikey,
      keysCollection : opts.keysCollection
    })
  );
}

function verifyVipConfig() {
  var promise = doVipRequest('listExternalPlatforms');
  return useVipConfig(promise, (vipConfig, externalPlatforms) => {
    if ( _.findWhere(externalPlatforms,
      {identifier : vipConfig.vip_external_storage_name })) {
        return true;
    } else {
      throw { vipPluginError : 'GIRDER_NOT_CONFIGURED_IN_VIP' };
    }
  });
}

/* opts
  keysCollection
*/
function fetchGirderApiKeysForVip(opts = {}) {
  var initialPromise;
  if (opts.keysCollection)  {
    initialPromise = Promise.resolve(opts.keysCollection);
  } else {
    var allApiKeys = new ApiKeyCollection();
    initialPromise = allApiKeys.fetch({userId: getCurrentUser().id}).then(() => allApiKeys);
  }
  return initialPromise.then( apikeys => apikeys.where({name : VIP_PLUGIN_API_KEY}) );
}

/* opts
  doPush
  apikey
  keysCollection
*/
function createAndPushGirderApiKey(opts = {}) {
  var apikey = opts.apikey || new ApiKeyModel();
  apikey.set({
    name: VIP_PLUGIN_API_KEY,
    tokenDuration: 1
  });
  return (opts.apikey ? Promise.resolve() : apikey.save())
  .then( () => getVipConfig() )
  .then( (vipConfig) => {
    if (opts.keysCollection)
      opts.keysCollection.add(apikey);
    if (opts.doPush){
      return doVipRequest(
        'createOrUpdateApiKey',
        vipConfig.vip_external_storage_name,
        apikey.get('key')
      )
    }
  });
}

/* opts
  onError
*/
function isGirderApiKeyOk(apikey, opts = {}) {
  var error;
  if (!apikey.get("active")) {
    error = 'GIRDER_KEY_NOT_ACTIVE';
  } else if (!apikey.has("tokenDuration") || apikey.get("tokenDuration") > 1) {
    error = 'GIRDER_KEY_TOKEN_TOO_LONG';
  } else if (apikey.get('scope') !== null &&
    _.difference(NEEDED_TOKEN_SCOPES, apikey.get('scope')).length !== 0) {
      error = 'GIRDER_KEY_MISSING_RIGHTS';
  } else {
    // it's ok
    return true;
  }
  opts.onError && opts.onError(error);
  return false;
}

function deleteApiKeys(apiKeys) {
  if (apiKeys instanceof Backbone.Model) {
    apiKeys = [apiKeys];
  } else if (apiKeys instanceof Backbone.Collection) {
    apiKeys = apiKeys.models;
  }
  // its an array
  return Promise.all(
    _.map(apiKeys, apikey => apikey.destroy())
  ).then( () => undefined);
}

// CARMIN utils

var carminClient = null;

function getCarminClient(newApiKey) {
  if (carminClient) {
    if (newApiKey) {
      carminClient.apiKey = newApiKey;
    }
    return Promise.resolve(carminClient);
  }
  // init carminClient
  if (! newApiKey && ! hasTheVipApiKeyConfigured()) {
    messageGirder("danger", 'Wrong VIP plugin client creation');
    Promise.reject("Wrong VIP plugin client creation");
  } else if (! newApiKey) {
    newApiKey = getCurrentUser().get('apiKeyVip');
  }
  return getVipConfig().then(vipConfig => {
    carminClient = new CarminClient(vipConfig.vip_url, newApiKey);
    return carminClient;
  });
}

function doVipRequest(vipFunction, ...requestParam) {
  return getCarminClient()
  .then( client => client[vipFunction](...requestParam) )
  .catch(data => {
    if (data.errorCode && (data.errorCode === 40101 || data.errorCode === 8002)) { // bad credentials error code changed
      throw { vipPluginError : 'WRONG_VIP_API_KEY' };
    } else if (data.errorCode && data.errorMessage) {
      throw "An error occured while using the VIP API "
        + " (" + data.errorMessage + " -- " + data.errorCode + ")";
    } else {
      throw "An error occured while using the VIP API (" + data + ")";
    }
  });
}

function sortPipelines(allPipelines) {

  var pipelineSortFunc = function (pipelineA, pipelineB){
    if (!pipelineA.versionClean && pipelineB.versionClean)
      return -1;

    if (pipelineA.versionClean && !pipelineB.versionClean)
      return 1;

    if (pipelineA.versionClean && pipelineB.versionClean)
      return compareVersions(pipelineA.versionClean, pipelineB.versionClean);
  }

  var cid = 0;

  return _.chain(allPipelines)
  // Créer une nouvelle variable dans chaque version
  // Cette variable 'versionClean' est la version sans superflux (on garde que les chiffres et les points)
  // cad: v0.1.2(experimental) -> 0.1.2
  .each(pipeline =>  {
    pipeline["versionClean"] = pipeline["version"].replace(/[^0-9\.]/g, '')
      .replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, ''); // also remove multiple dots and begining/endind dots
    pipeline["versionId"] = (cid++).toString();
  })
  .groupBy('name') // Regroupe toutes les pipelines par leur nom
  .each(pipelinesByName => pipelinesByName.sort(pipelineSortFunc).reverse())
  // put an cid as key instead of a name
  .indexBy(pipelines => pipelines[0].versionId)
  .value();
  // return {"1" : [{identifier : xxxx, ... ,versionId : 1}, ... , {identifier : xxxx, ... ,versionId : 4}],
  // ... ,
  //  "42" : [{identifier : xxxx, ... ,versionId : 42}, ... , {identifier : xxxx, ... ,versionId : 31}] }
}



export {
  messageGirder,
  fetchGirderFolders,
  getVipConfig,
  useVipConfig,

  hasTheVipApiKeyConfigured,
  isPluginActivatedOn,
  saveVipApiKey,

  updateApiKeysConfiguration,
  verifyApiKeysConfiguration,

  doVipRequest,
  sortPipelines
};
