// Import utilities
import _ from 'underscore';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest, cancelRestRequests } from '@girder/core/rest';
import compareVersions from 'compare-versions';
import router from '@girder/core/router';
import events from '@girder/core/events';
import ApiKeyCollection from '@girder/core/collections/ApiKeyCollection.js'
import ApiKeyModel from '@girder/core/models/ApiKeyModel.js'
import { VIP_PLUGIN_API_KEY, COLLECTIONS_IDS, VIP_EXTERNAL_STORAGE_NAME } from '../constants';

// Import views
import FrontPageView from '@girder/core/views/body/FrontPageView';


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

// VIP api key utils

function hasTheVipApiKeyConfigured() {
  var currentUser = getCurrentUser()
  return currentUser !== null
    && typeof currentUser !== 'undefined'
    && currentUser.get('apiKeyVip').length != 0;
}

function getCurrentApiKeyVip () {
  if (typeof getCurrentUser().get('apiKeyVip') === 'undefined' || getCurrentUser().get('apiKeyVip').length == 0) {
    cancelRestRequests('fetch');
    router.navigate('', {trigger: true});
    messageGirder("danger", "You must configure your VIP API key in \
        'My Account > VIP API key'. You must have an account on VIP \
        (https://vip.creatis.insa-lyon.fr) where you can create or get \
        an api key in 'My Account > API key'"
      , 30000);
    return null;
  }

  return (getCurrentUser().get('apiKeyVip') ? getCurrentUser().get('apiKeyVip') : null);
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
  }).done((resp) => {
    messageGirder("success", "API key of VIP has changed with success.");
    getCurrentUser().set('apiKeyVip', newkey);
    // reload header view to refresh the 'My execution' menu
    events.trigger('vip:vipApiKeyChanged', {apiKeyVip: newkey});
  }).fail(() => {
    messageGirder("danger", "An error occured while processing your request");
  });
}

// girder api key utils

function updateGirderApiKey(carminClient) {
  // fetch api key
  var allApiKeys = new ApiKeyCollection();
  allApiKeys.filterFunc = function(apikey) {
    return VIP_PLUGIN_API_KEY === apikey.name;
  };
  allApiKeys.fetch({userId: user.id})
  .then( () => {
    if (allApiKeys.length > 1) {
      // not normal. Delete all and create a new one
      return deleteApiKeys(allApiKeys);
    } else {
      return allApiKeys.length ? allApiKeys.pop() : null;
    }
  })
  // if it exists, check it
  .then( apikey => {
    // check if is ok
    if (apikey && isGirderApiKeyOk) {
      return apikey;
    } else if (apikey) {
      // not ok, delete it
      return deleteApiKeys(apikey);
    }
  })
  // create it if necessary
  .then( apikey => apikey ? apikey : createGirderApiKey()  )
  // and push it on vip
  .then( apikey => carmin.createOrUpdateApiKey(
    VIP_EXTERNAL_STORAGE_NAME, apikey.get('key'))
  );
}

function createGirderApiKey() {
  var apikey = new ApiKeyModel();
  apikey.set({
    name: VIP_PLUGIN_API_KEY,
    tokenDuration: 1
  });
  apikey.save().then( () => return apikey);
}

function isGirderApiKeyOk(apikey) {
  var error;
  if (!apikey.get("active")) {
    error = 'Your Girder API key for VIP is not active. It will be replaced';
  } else if (!apikey.has("tokenDuration") || apikey.get("tokenDuration") > 1) {
    error = 'Your Girder API key for VIP allowed for long-lived tokens. It will be replaced';
  } else {
    return true;
  }
  messageGirder("warning", error);
  return false;
}

function deleteApiKeys(apiKeys) {
  if (! _.isArray(apiKeys))
    apiKeys = [ apiKeys ];
  var resources = JSON.stringify({
   api_key : _.pluck(apiKeys, 'id')
  });
  return restRequest({
      url: 'resource',
      method: 'POST',
      data: { resources: resources, progress: true },
      headers: { 'X-HTTP-Method-Override': 'DELETE' }
  })
  // need to return void
  .then( () => return undefined );
}

// CARMIN utils

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
  checkRequestError,
  isPluginActivatedOn,
  hasTheVipApiKeyConfigured,
  getCurrentApiKeyVip,
  saveVipApiKey,
  sortPipelines,
  createOrVerifyPluginApiKey,
  createNewToken,
  updateGirderApiKey,
  isVipPlatformConfig
};
