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
      this.updateStatus(resp).then(function (){

        // When the PipelineCollection is update, get the content of this collection and call the render
        const promiseArray = [];
        setTimeout(function() {
          promiseArray.push(this.collection.fetch());
          $.when(...promiseArray).done(() => {
            this.listenTo(this.collection, 'g:changed', this.render);
            this.render();
            this.getResults(this.collection.toArray());
          });
        }.bind(this), 1000);
      }.bind(this));

    });
  },

  render: function () {
    this.$el.html(MyPipelinesTempalte({
      pipelines: this.collection.toArray(),
      status: constants.Status,
      user: getCurrentUser()
    }));

    return this;
  },

  updateStatus: function (pipeline_executions) {
    return new Promise(function (resolve) {
      _.each(pipeline_executions, function(execution) {
        if (execution.status != this.statusKeys[4] && execution.status != this.statusKeys[5]) {
          this.carmin.getExecution(execution.vipExecutionId).then(function (workflow) {

            if (execution.status != workflow.status.toUpperCase()) {
              restRequest({
                method: 'PUT',
                url: 'pipeline_execution/' + execution._id + "/status",
                data: { 'status': workflow.status.toUpperCase() }
              });
            }

          });
        }
      }.bind(this));
      resolve();
    }.bind(this));
  },

  getResults: function (pipeline_executions) {
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
        }).done((resp) => {
          execution.childFolderResult = resp._id;
          restRequest({
            method: 'PUT',
            url: 'pipeline_execution/' + execution.id + '/idChildFolderResult',
            data: {idChild: resp._id}
          }).done(() => {
            this.carmin.getExecutionResults(execution.get('vipExecutionId')).then(function (results){
              _.each(results, function (result) {

                // SCRIPT AVANT CHANGEMENT DE L'API VIP
                result = result.replace('/output.txt', '');
                result = result.replace('content', 'list');
                result = result.replace('?action=list', '');
                result = result.replace('http://vip.creatis.insa-lyon.fr/rest/path/', '');

                this.carmin.getFolderDetails(result).then(function (data) {
                  var count = {i: 0, nbSuccess: 0};
                  this.downloadFileFromVip(execution, data, count);
                }.bind(this));


                // SCRIPT APRES CHANGEMENT DE L'API VIP
                // appeller directement la fonction this.downloadFileFromVip(execution, result, i)

              }.bind(this));
            }.bind(this));
          });
        });
      }
    }.bind(this));
  },

  downloadFileFromVip: function (execution, results, count) {
    if (count.i == results.length)
      return ;

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
      }).done(() => {
        count.nbSuccess++;

        if (count.nbSuccess == results.length) {
          restRequest({
            method: 'PUT',
            url: 'pipeline_execution/' + execution.id + '/status',
            data: {status: this.statusKeys[4]}
          });
        }
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
  },

  getResultFolderName: function (execution) {
    var date = new Date(execution.get('timestampCreation') * 1000);
    var folderName = "Results - " + execution.get('name') + ' - ' + date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();

    return folderName;
  }

});

export default MyPipelines;
