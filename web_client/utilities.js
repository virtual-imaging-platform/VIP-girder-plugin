// Import utilities
import _ from 'underscore';
import { getCurrentUser } from 'girder/auth';
import { restRequest, cancelRestRequests } from 'girder/rest';
import compareVersions from 'compare-versions';
import router from 'girder/router';
import events from 'girder/events';
import ApiKeyCollection from 'girder/collections/ApiKeyCollection.js'
import ApiKeyModel from 'girder/models/ApiKeyModel.js'
import { Status, GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP } from './constants';

// Import views
import FrontPageView from 'girder/views/body/FrontPageView';

function getTimestamp () {
  return (Math.round((new Date()).getTime() / 1000));
}

function messageGirder (type, text, duration) {
  events.trigger('g:alert', {
    text: text,
    type: type,
    duration: duration
  });
}

function checkRequestError (data) {
  if (typeof data !== 'undefined' && typeof data.errorCode !== 'undefined' && data.errorCode != null) {
    messageGirder("danger", data.errorMessage, 3000);
    return 1;
  }
  return 0;
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

function sortPipelines(allPipelines) {
  // Regroupe toutes les pipelines par leur nom
  var pipelinesByName = _.groupBy(allPipelines, 'name');

  // Créer une nouvelle variable dans chaque version
  // Cette variable 'versionClean' est la version sans superflux (on garde que les chiffres et les points)
  // cad: v0.1.2(experimental) -> 0.1.2
  var pipelinesClean = _.map(pipelinesByName, function(e){
    return _.map(e, function (a){
      a["versionClean"] = a["version"].replace(/[^0-9\.]/g, '');
      return a;
    });
  });

  // Tri les éléments du tableau par rapport aux valeurs de 'versionClean' (desc)
  var pipelines = _.map(pipelinesClean, function (e) {
    return e.sort(function (a, b){
      if (!a.versionClean && b.versionClean)
        return -1;

      if (a.versionClean && !b.versionClean)
        return 1;

      if (a.versionClean && b.versionClean)
        return compareVersions(a.versionClean, b.versionClean);
    }).reverse();
  });

  // Créer un objet en remplacant les clés par l'id du pipeline
  // cad: au lieu d'avoir array[0], on a array['Id_Of_Pipeline']
  var keys = Object.keys(pipelinesByName);
  var tmp = {};

  pipelines.forEach(function (e, k) {
    tmp[keys[k]] = e;
  })

  return tmp;
}

function createNewToken(user) {
  return createOrVerifyPluginApiKey(user)
  .then( apikey => {
    return restRequest({
      method: 'POST',
      url: 'api_key/token',
      data: {
        key: apikey.get("key")
      }
    });
  })
  .then(resp => resp.authToken.token);
}

function createOrVerifyPluginApiKey(user) {
  return new Promise((resolve, reject) => {
    var allApiKeys = new ApiKeyCollection();
    // filter apikey to only select the one searched
    allApiKeys.filterFunc = function(apikey) {
      return GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP === apikey.name;
    };

    allApiKeys.on('g:changed', () => {
      if (allApiKeys.length > 1) {
        reject("Too many apikeys returned");
      } else {
        resolve(allApiKeys.length ? allApiKeys.pop() : null);
      }
    })
    .fetch({
      userId: user.id
    })
  })
  .then(apikey => {
    if (apikey) {
      return verifyPluginApiKey(apikey);
    } else {
      return createPluginApiKey();
    }
  });
}

function verifyPluginApiKey(apikey) {
  if (!apikey.get("active")) {
    messageGirder("warning", "The girder API key to use the VIP plugin should \
      be active")
    return Promise.reject();
  } else if (!apikey.has("tokenDuration") || apikey.get("tokenDuration") > 1) {
    messageGirder("warning", "The girder API key to use the VIP plugin should \
      have a token duration of one day")
    return Promise.reject();
  } else {
    return Promise.resolve(apikey);
  }
}

function createPluginApiKey() {
  return new Promise(resolve => {
    var apikey = new ApiKeyModel();
    apikey.set({
      name: GIRDER_API_KEY_NAME_TO_BE_USED_FROM_VIP,
      tokenDuration: 1
    });
    apikey.once('g:saved', () => resolve(apikey))
    .save();
  });
}

export {
  getTimestamp,
  messageGirder,
  checkRequestError,
  getCurrentApiKeyVip,
  sortPipelines,
  createOrVerifyPluginApiKey,
  createNewToken
};
