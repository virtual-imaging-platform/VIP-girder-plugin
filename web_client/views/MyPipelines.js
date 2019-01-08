// Import utilities
import _ from 'underscore';
import { cancelRestRequests, restRequest } from 'girder/rest';
import * as constants from '../constants';
import { getCurrentApiKeyVip, getStatusKeys, messageGirder } from '../utilities';
import { getCurrentUser } from 'girder/auth';
import CarminClient from '../vendor/carmin/carmin-client';

// Import views
import View from 'girder/views/View';

// Import collections
import PipelineCollection from '../collections/PipelineCollection';

// Import templates
import MyPipelinesTemplate from '../templates/myPipelines.pug';

// Import stylesheets
import '../stylesheets/myPipelines.styl';

var MyPipelines = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    // Get the api key of VIP
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
    // Display the list of executions
    this.$el.html(MyPipelinesTemplate({
      pipelines: this.collection.toArray(),
      status: constants.Status,
      statusKeys: this.statusKeys,
      user: getCurrentUser()
    }));

    return this;
  },

  // Get the status of the executon VIP side. If the status is different from the girder side, update it.
  updateStatus: function (pipeline_executions) {
    return new Promise(function (resolve) {
      const promiseArray = [];

      // For each executions
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

  // Remark: doesn't work for the second version, need to adapt or delete this part
  // If the status udpated is 'Finished", get the results of the executon (from VIP to Girder)
  // getResults: function (pipeline_executions) {
  //   // For each executions
  //   _.each(pipeline_executions, function (execution) {
  //     var chain = Promise.resolve();
  //
  //     // If the status is 'Finished'
  //     if (execution.get('status') == this.statusKeys[3]) {
  //       // Create the child folder (with date)
  //       restRequest({
  //         method: 'POST',
  //         url: 'folder',
  //         data: {
  //           parentType: 'folder',
  //           parentId: execution.get('pathResultGirder'),
  //           name: this.getResultFolderName(execution)
  //         }
  //       }).then((resp) => {
  //         // Put the id of the result directory in execution model
  //         execution.childFolderResult = resp._id;
  //         return restRequest({
  //           method: 'PUT',
  //           url: 'pipeline_execution/' + execution.id + '/idChildFolderResult',
  //           data: {idChild: resp._id}
  //         });
  //       }).then(() => {
  //         return this.carmin.getExecutionResults(execution.get('vipExecutionId'));
  //       }).then(function (results) {
  //         _.each(results, function (path) {
  //           // SCRIPT AVANT CHANGEMENT DE L'API VIP
  //           path = path.replace('?action=content', '');
  //           path = path.replace(constants.carminURL + '/path', '');
  //
  //           chain = chain.then(function (){
  //             return this.downloadFileFromVip(execution, results, path);
  //           }.bind(this));
  //
  //         }.bind(this));
  //       }.bind(this)).catch((e) => {
  //         this.deleteResultFolder(execution);
  //       });
  //     }
  //   }.bind(this));
  // },

  // Remark: doen't work for the second version, need to adapt or delete this part
  // downloadFileFromVip: function (execution, results, path) {
  //   return new Promise(function(resolve) {
  //     this.carmin.downloadFile(path).then(function (content) {
  //       var fileName = path.substring(path.lastIndexOf('/') + 1);
  //       var myFile = new File([content], fileName, {type:"application/octet-stream"});
  //       var size = myFile.size;
  //
  //       var chain = Promise.resolve();
  //
  //       restRequest({
  //         method: 'POST',
  //         url: 'file?parentType=folder&parentId=' + execution.childFolderResult + '&name=' + fileName
  //         + '&size=' + size
  //       }).then(function (data) {
  //         this.uploadChunk(data._id, content, 0, function (data) {
  //
  //           // Status set to FETCHED
  //           restRequest({
  //             method: 'PUT',
  //             url: 'pipeline_execution/' + execution.id + '/status',
  //             data: {status: this.statusKeys[4]}
  //           });
  //
  //           // Display button 'Results'
  //           var resultPath = "#user/" + getCurrentUser().id + "/folder/" + execution.childFolderResult;
  //           $('.deletePipeline[value="'+ execution.id +'"]').prev().css('visibility', '').attr('href', resultPath);
  //
  //           // Change the status
  //           $('.deletePipeline[value="'+ execution.id +'"]').closest('tr.pipeline').find('td.status').html(constants.Status['FETCHED']);
  //
  //           // Delete folder process-timestamp in VIP
  //           this.carmin.deletePath(execution.get('folderNameProcessVip')).then(function(){}, function (){
  //             console.log('Error: Folder process-timestamp could not be deleted');
  //           });
  //
  //           resolve();
  //
  //           // Set metadata as workflow
  //           restRequest({
  //             method: 'PUT',
  //             url: 'item/' + data.itemId + '/metadata',
  //             contentType: 'application/json',
  //             data: JSON.stringify({
  //               workflow: execution.get('vipExecutionId')
  //             })
  //           });
  //
  //         }.bind(this));
  //       }.bind(this), function () {
  //         messageGirder("danger", "There was a problem uploading results of executon " + execution.get('name'));
  //         this.deleteResultFolder(execution);
  //       });
  //
  //     }.bind(this), function () {
  //       messageGirder("danger", "There was a problem downloading results of executon " + execution.get('name'));
  //       this.deleteResultFolder(execution);
  //     });
  //   }.bind(this));
  // },

  // Remark: doen't work for the second version, need to adapt or delete this part
  // uploadChunk: function (uploadId, content, offset, callback) {
  //   var tmp = content.slice(offset, offset + constants.ChunkSize);
  //   restRequest({
  //     method: 'POST',
  //     url: 'file/chunk?uploadId=' + uploadId + '&offset=' + offset,
  //     data: tmp,
  //     processData: false,
  //     contentType: false
  //   }).then(function (resp) {
  //     // When the upload is finished, we have an json object with a field '_modelType'
  //     if (typeof resp._modelType === "undefined" || resp._modelType == null) {
  //       return this.uploadChunk(uploadId, content, resp.received, callback);
  //     }
  //     callback(resp);
  //   }.bind(this), function (){
  //     messageGirder("danger", "There was a problem uploading results of executon " + execution.get('name'));
  //     this.deleteResultFolder(execution);
  //   });
  // },
  //
  // getResultFolderName: function (execution) {
  //   var date = new Date(execution.get('timestampCreation') * 1000);
  //   var folderName = "Results - " + execution.get('name') + ' - ' + date.getFullYear() + '/'
  //   + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes()
  //   + ':' + date.getSeconds();
  //
  //   return folderName;
  // },

  // Delete a pipeline executon of the db
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
  },

  // If the download is impossible, update the status to 'NOTFETCHED' and delete result directory
  deleteResultFolder: function (execution) {
    // Update status to 'NOTFETCHED'
    restRequest({
        method: 'PUT',
        url: 'pipeline_execution/' + execution.id + '/status',
        data: {status: this.statusKeys[5]},
      });

    // Delete the result folder
    restRequest({
      method: "DELETE",
      url: "folder/" + execution.childFolderResult
    });
  }

});

export default MyPipelines;
