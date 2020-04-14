// Import utilities
import _ from 'underscore';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest, cancelRestRequests } from '@girder/core/rest';
import compareVersions from 'compare-versions';
import events from '@girder/core/events';
import ApiKeyCollection from '@girder/core/collections/ApiKeyCollection.js'
import ApiKeyModel from '@girder/core/models/ApiKeyModel.js'
import FolderCollection from '@girder/core/collections/FolderCollection';
import { VIP_PLUGIN_API_KEY, COLLECTIONS_IDS, VIP_EXTERNAL_STORAGE_NAME, NEEDED_TOKEN_SCOPES, CARMIN_URL } from '../constants';
import CarminClient from '../vendor/carmin/carmin-client';


// general utils

function getTimestamp () {
  return (Math.round((new Date()).getTime() / 1000));
}

function messageGirder (type, text, duration = 5000) {
  events.trigger('g:alert', {
    text: text,
    type: type,
    duration: duration
  });
}

function fetchGirderFolders: function (model, level=0) {
  var children = new FolderCollection();

  return children.fetch({
      parentType: model.resourceName,
      parentId: model.id
  })
  .then( (() => this).bind(children)
  .then(children =>
    Promise.all( children.map(child => fetchGirderFolders(child, level+1)) )
  ).then(
    childrenWithFolders => {
      model : moder,
      level : level,
      children : _.sortBy(childrenWithFolders, child => child.model.get('name'))
    }
  );
/*
  return restRequest({
    method: "GET",
    url: "folder/",
    data: {
      parentType: opts.parentType,
      parentId: opts.parentId
    },
  }).done((resp) => {
    if (resp.length == 0) {
      return;
    }

    _.each(resp, function(e) {
      e.path = path.concat("/"+e.name);
      e.indent = i;
      e.indentText = "&nbsp;".repeat((i - 1) * 3);
      this.foldersCollection.push(e);
      this.getFolderRecursively(e._id, i, e.path);
    }.bind(this));
  });*/
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
    return false;
  } else if (model.resourceName === 'collection') {
    return isPluginActivatedOnCollection(model.id);
  } else if (_.contains(['item', 'folder'], model.resourceName)) {
    return model.get('baseParentType') === 'collection' &&
      isPluginActivatedOnCollection(model.get('baseParentId'));
  }
}

function isPluginActivatedOnCollection(collectionId) {
  return _.contains(COLLECTIONS_IDS, collectionId);
}

function saveVipApiKey(newkey) {
  return restRequest({
    method: 'PUT',
    url: '/user/' + getCurrentUser().id + '/apiKeyVip',
    data: {
      apiKeyVip: newkey
    }
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

    // test if vip key is configured
    if (! hasTheVipApiKeyConfigured()) throw ERRORS.VIP_API_KEY_NOT_CONFIGURED;

    if (opts.newKey) getCarminClient(opts.newKey);
    // test vip config and api key
    return verifyVipConfig()
    .then( () => verifyGirderApiKey({
      onlyCheck : false,
      printWarning : opts.printWarning,
      pushOnVip : true,
      firstTime : true,
      keysCollection : opts.keysCollection
    });
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
  if (! hasTheVipApiKeyConfigured()) throw ERRORS.VIP_API_KEY_NOT_CONFIGURED;

  // test it is valid (by fetching external keys)
  return doVipRequest(getCarminClient().listUserExternalPlatformKeys)
  // test there is a girder key in there
  .then(userVipKeys =>
    _.findWhere(userVipKeys, {identifier : constants.VIP_EXTERNAL_STORAGE_NAME})
  )
  // verify it is ok
  .then(vipKeyForGirder => {
    if ( vipKeyForGirder) {
      // test that key exist in girder and is valid
      return verifyGirderApiKey({
        onlyCheck : true,
        printWarning : opts.printWarning,
        keyValue : vipKeyForGirder.apiKey,
        pushOnVip : false
      });
    }
    // problem : girder non configured in vip or girder key not configured
    return verifyVipConfig()
    .then( () => throw { vipPluginError : 'NO_KEY_CONFIGURED_IN_VIP' });
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
    if (printWarning) {
      messageGirder("danger", ERRORS[errorCode]);
    }
    if (onlyCheck) {
      throw { vipPluginError : errorCode };
    }
  }

  return fetchGirderApiKeysForVip({keysCollection : opts.keysCollection})
  .then( (girderApiKeysForVip) => {
    if (opts.keyValue) {
      return girderApiKeysForVip.findWhere({key : opts.keyValue});
    } if (girderApiKeysForVip.length > 1) {
      onWarningFunction('SEVERAL_GIRDER_KEY');
      return deleteApiKeys(girderApiKeysForVip);
    } else {
      return girderApiKeysForVip.length ? girderApiKeysForVip.pop() : null;
    }
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
    return isGirderApiKeyOk(apikey, {
      onError : onWarningFunction
    })
    .then(isOk => isOk ? apikey : deleteApiKeys(apikey));
  })
  // create it if necessary
  .then( apikey => createAndPushGirderApiKey({
      doPush : opts.pushOnVip,
      apikey  : apikey,
      keysCollection : opts.keysCollection
    })
  );
}

function doVipRequest(vipFunction) {
  return vipFunction.call()
  .catch(data => {
    if (data.errorCode && data.errorCode === 40101) {
      throw { vipPluginError : 'WRONG_VIP_API_KEY' };
    } else {
      throw "An error occured while using the VIP API (" + data + ")");
    }
  });
}

function verifyVipConfig() {
  return doVipRequest(getCarminClient().listExternalPlatforms)
  .then( vipExternalPlatforms => {
    if ( _.findWhere(vipExternalPlatforms,
      {identifier : constants.VIP_EXTERNAL_STORAGE_NAME})) {
      throw { vipPluginError : 'GIRDER_NOT_CONFIGURED_IN_VIP' };
    } else {
      return true;
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
    initialPromise = allApiKeys.fetch({userId: getCurrentUser().id}).then(allApiKeys);
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
  return opts.apikey ? Promise.resolve(apikey) : apikey.save()
  .then( () => {
    if (opts.keysCollection)
      opts.keysCollection.add(apikey);
    if (opts.doPush){
      return getCarminClient()
        .createOrUpdateApiKey(VIP_EXTERNAL_STORAGE_NAME, apikey.get('key'))
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
  if (carminClient && ! newApiKey) {
    return carminClient;
  } else if (carminClient) {
    // change api key
    carminClient.apiKey = newApiKey;
    return carminClient;
  }
  // init carminClient
  if (! newApiKey && ! hasTheVipApiKeyConfigured()) {
    messageGirder("danger", 'Wrong VIP plugin client creation');
    throw "Wrong VIP plugin client creation";
  } else if (! newApiKey) {
    newApiKey = currentUser.get('apiKeyVip');
  }
  carminClient = new CarminClient(CARMIN_URL, newkey);
  return carminClient;
}

function checkRequestError (data) {
  if (typeof data !== 'undefined' && typeof data.errorCode !== 'undefined' && data.errorCode != null) {
    messageGirder("danger", data.errorMessage);
    return 1;
  }
  return 0;
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
    pipeline["versionClean"] = pipeline["version"].replace(/[^0-9\.]/g, '');
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
  getTimestamp,
  messageGirder,
  fetchGirderFolders,

  hasTheVipApiKeyConfigured,
  isPluginActivatedOn,
  saveVipApiKey,

  updateApiKeysConfiguration,
  verifyApiKeysConfiguration,

  getCarminClient,
  checkRequestError,
  sortPipelines
};
