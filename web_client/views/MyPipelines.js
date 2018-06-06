// Import utilities
import _ from 'underscore';
import { cancelRestRequests, restRequest } from 'girder/rest';
import * as constants from '../constants';
import { getCurrentApiKeyVip, getStatusKeys } from '../utilities';
import { getCurrentUser } from 'girder/auth';
import CarminClient from '../vendor/carmin/carmin-client';

// Import views
import View from 'girder/views/View';

// Import collections
import PipelineCollection from '../collections/PipelineCollection';

// Import models
import PipelineModel from '../models/PipelineModel';

// Import templates
import MyPipelinesTempalte from '../templates/myPipelines.pug';

// Import stylesheets
import '../stylesheets/myPipelines.styl';

// async function asyncForEach(array, callback) {
//   for (let index = 0; index < array.length; index++) {
//     await callback(array[index], index, array)
//   }
// }

var MyPipelines = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    var apiKeyVip = getCurrentApiKeyVip();
    if (apiKeyVip == null) {
      return ;
    }

    this.carmin = new CarminClient(constants.carminURL, apiKeyVip);
    this.collection = new PipelineCollection;
    this.statusKeys = getStatusKeys();

    // Get all pipeline executions
    restRequest({
      method: 'GET',
      url: 'pipeline_execution'
    }).then((resp) => {
      return this.updateStatus(resp);
    }).then(() => {
      // When the PipelineCollection is update, get the content of this collection and call the render
      const promiseArray = [];
      promiseArray.push(this.collection.fetch());
      $.when(...promiseArray).done(() => {
        this.listenTo(this.collection, 'g:changed', this.render);
        this.render();
        this.getResults(this.collection.toArray());
      });
    });

  },

  events: {
    'click .deletePipeline' : 'deletePipeline'
  },

  render: function () {
    this.$el.html(MyPipelinesTempalte({
      pipelines: this.collection.toArray(),
      status: constants.Status,
      statusKeys: this.statusKeys,
      user: getCurrentUser()
    }));

    return this;
  },

  updateStatus: function (pipeline_executions) {
    return new Promise(function (resolve) {
      const promiseArray = [];
      _.each(pipeline_executions, function(execution) {
        if (execution.status != this.statusKeys[4] && execution.status != this.statusKeys[5]) {
          var promiseCarmin = this.carmin.getExecution(execution.vipExecutionId).then(function (workflow) {
            if (execution.status != workflow.status.toUpperCase()) {
              var promise = restRequest({
                method: 'PUT',
                url: 'pipeline_execution/' + execution._id + "/status",
                data: { 'status': workflow.status.toUpperCase() }
              });
              promiseArray.push(promise);
            }
          });
          promiseArray.push(promiseCarmin);
        }
      }.bind(this));
      $.when(...promiseArray).done(() => {
        resolve();
      });
    }.bind(this));
  },

  getResults: function (pipeline_executions) {
    var chain = Promise.resolve();
    _.each(pipeline_executions, function (execution) {
      if (execution.get('status') == this.statusKeys[3]) {
        // Create the child folder (with date)
        restRequest({
          method: 'POST',
          url: 'folder',
          data: {
            parentType: 'folder',
            parentId: execution.get('pathResultGirder'),
            name: this.getResultFolderName(execution)
          }
        }).then((resp) => {
          execution.childFolderResult = resp._id;
          return restRequest({
            method: 'PUT',
            url: 'pipeline_execution/' + execution.id + '/idChildFolderResult',
            data: {idChild: resp._id}
          });
        }).then(() => {
          return this.carmin.getExecutionResults(execution.get('vipExecutionId'));
        }).then(function (results) {
          _.each(results, function (result) {
            // SCRIPT AVANT CHANGEMENT DE L'API VIP
            result = result.replace('/output.txt', '');
            result = result.replace('content', 'list');
            result = result.replace('?action=list', '');
            result = result.replace('http://vip.creatis.insa-lyon.fr/rest/path/', '');

            this.carmin.getFolderDetails(result).then(function (data) {
              var count = {i: 0, nbSuccess: 0};

              chain = chain.then(function (){
                return this.downloadFileFromVip(execution, data, count);
              }.bind(this));

            }.bind(this));

            // SCRIPT APRES CHANGEMENT DE L'API VIP
            // appeller directement la fonction this.downloadFileFromVip(execution, result, i)

          }.bind(this));
        }.bind(this)).catch((e) => {
          console.log('Erreur: ' + e);
        });
      }
    }.bind(this));
  },

  // getResults: function (pipeline_executions) {
  //   var chain = Promise.resolve();
  //   _.each(pipeline_executions, function (execution) {
  //     if (execution.get('status') == this.statusKeys[3]) {
  //
  //       // Create the child folder (with date)
  //       restRequest({
  //         method: 'POST',
  //         url: 'folder',
  //         data: {
  //           parentType: 'folder',
  //           parentId: execution.get('pathResultGirder'),
  //           name: this.getResultFolderName(execution)
  //         }
  //       }).done((resp) => {
  //         execution.childFolderResult = resp._id;
  //         restRequest({
  //           method: 'PUT',
  //           url: 'pipeline_execution/' + execution.id + '/idChildFolderResult',
  //           data: {idChild: resp._id}
  //         }).done(() => {
  //           this.carmin.getExecutionResults(execution.get('vipExecutionId')).then(function (results){
  //             _.each(results, function (result) {
  //               console.log(result);
  //               // SCRIPT AVANT CHANGEMENT DE L'API VIP
  //               result = result.replace('/output.txt', '');
  //               result = result.replace('content', 'list');
  //               result = result.replace('?action=list', '');
  //               result = result.replace('http://vip.creatis.insa-lyon.fr/rest/path/', '');
  //
  //               this.carmin.getFolderDetails(result).then(function (data) {
  //                 console.log(chain);
  //                 var count = {i: 0, nbSuccess: 0};
  //                 chain = chain.then(function (){
  //                   return this.downloadFileFromVip(execution, data, count);
  //                 }.bind(this));
  //               }.bind(this));
  //
  //
  //               // SCRIPT APRES CHANGEMENT DE L'API VIP
  //               // appeller directement la fonction this.downloadFileFromVip(execution, result, i)
  //
  //             }.bind(this));
  //           }.bind(this));
  //         });
  //       });
  //     }
  //   }.bind(this));
  // },

  downloadFileFromVip: function (execution, results, count) {
    return new Promise(function(resolve) {
      if (count.i == results.length)
        return Promise.resolve();

      var res = results[count.i].path;

      this.carmin.downloadFile(res).then(function (content) {
        var fileName = res.substring(res.lastIndexOf('/') + 1);
        var myFile = new File([content], fileName, {type:"application/octet-stream"});
        var size = myFile.size;

        restRequest({
          method: 'POST',
          url: 'file?parentType=folder&parentId=' + execution.childFolderResult + '&name=' + fileName
          + '&size=' + size,
          data: myFile,
          cache: false,
          contentType: false,
          processData: false,
        }).done((data) => {
          count.nbSuccess++;

          if (count.nbSuccess == results.length) {
            // Status set to FETCHED
            restRequest({
              method: 'PUT',
              url: 'pipeline_execution/' + execution.id + '/status',
              data: {status: this.statusKeys[4]}
            });

            // Display button 'Results'
            var resultPath = "#user/" + getCurrentUser().id + "/folder/" + execution.childFolderResult;
            $('.deletePipeline[value="'+ execution.id +'"]').prev().css('visibility', '').attr('href', resultPath);

            // Change the status
            $('.deletePipeline[value="'+ execution.id +'"]').closest('tr.pipeline').find('td.status').html(constants.Status['FETCHED']);

            // Delete folder process-timestamp in VIP
            this.carmin.deletePath(execution.get('folderNameProcessVip')).then(function(){}, function (){
              console.log('Error: Folder process-timestamp could not be deleted');
            });

            resolve();
          }

          // Set metadata
          restRequest({
            method: 'PUT',
            url: 'item/' + data.itemId + '/metadata',
            contentType: 'application/json',
            data: JSON.stringify({
              workflow: execution.get('vipExecutionId')
            })
          });

        }).fail(() => {
          // TODO Supprimer le dossier parent (celui avec le timestamp)
          restRequest({
            method: 'PUT',
            url: 'pipeline_execution/' + execution.id + '/status',
            data: {status: this.statusKeys[5]},
          });
        });

        count.i++;
        this.downloadFileFromVip(execution, results, count);

      }.bind(this));
    }.bind(this));
  },

  getResultFolderName: function (execution) {
    var date = new Date(execution.get('timestampCreation') * 1000);
    var folderName = "Results - " + execution.get('name') + ' - ' + date.getFullYear() + '/'
    + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes()
    + ':' + date.getSeconds();

    return folderName;
  },

  deletePipeline: function (e) {
    var buttonDelete = $(e.currentTarget);
    var id = buttonDelete.val();

    if (id) {
      restRequest({
        method: 'DELETE',
        url: 'pipeline_execution/' + id
      }).done(() => {
        var pipeline = buttonDelete.closest('tr.pipeline');

        $(pipeline).addClass('removed-pipeline').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function (e) {
          $(pipeline).remove();
        });
      });
    }
  }

});

export default MyPipelines;
