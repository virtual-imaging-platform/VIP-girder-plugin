// Import utilities
import _ from 'underscore';
import { getCurrentUser } from 'girder/auth';
import { restRequest, cancelRestRequests } from 'girder/rest';
import compareVersions from 'compare-versions';
import router from 'girder/router';
import events from 'girder/events';
import { Status } from './constants';

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
  console.log(data);
  if (typeof data.errorCode !== 'undefined' && data.errorCode != null) {
    messageGirder("danger", data.errorMessage, 3000);
    return 1;
  }
  return 0;
}

function getCurrentApiKeyVip () {
  if (typeof getCurrentUser().get('apiKeyVip') === 'undefined' || getCurrentUser().get('apiKeyVip').length == 0) {
    cancelRestRequests('fetch');
    router.navigate('', {trigger: true});
    messageGirder("danger", "You must have a VIP API key. For that, you have to go to https://vip.creatis.insa-lyon.fr and create an account. Now, you can fill in your key in 'My Account > VIP'", 6000);
    return null;
  }

  return (getCurrentUser().get('apiKeyVip') ? getCurrentUser().get('apiKeyVip') : null);
}

function getStatusKeys () {
  return Object.keys(Status);
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

  // Tri les éléments du tableau par rapport aux valeurs de 'versionClean'
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


  // // Tri le tableau (desc)
  // var pipelines = _.map(pipelinesClean, function (e) {
  //   var tmp = _.sortBy(e, 'versionClean');
  //   return tmp.reverse();
  // });

  // Créer un objet en remplacant les clés par l'id du pipeline
  // cad: au lieu d'avoir array[0], on a array['Id_Of_Pipeline']
  var keys = Object.keys(pipelinesByName);
  var tmp = {};

  pipelines.forEach(function (e, k) {
    tmp[keys[k]] = e;
  })

  return tmp;
}

export {
  getTimestamp,
  messageGirder,
  checkRequestError,
  getCurrentApiKeyVip,
  getStatusKeys,
  sortPipelines
};
