// Import utilities
import { cancelRestRequests, restRequest } from 'girder/rest';
import _ from 'underscore';
import * as constants from '../constants';
import { getCurrentApiKeyVip, getStatusKeys } from '../utilities';
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

    this.carmin.listPipelines().then(function (data) {
      console.log(data);
    });

    return ;

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
      status: constants.Status
    }));

    return this;
  },

  updateStatus: function (pipeline_executions) {
    return new Promise(function (resolve) {
      _.each(pipeline_executions, function(execution) {
        if (execution.status != this.statusKeys[4] && execution.status != this.statusKeys[5]) {
          this.carmin.getExecution(execution.vipExecutionId, function (workflow) {
            // Update the status
            if (execution.status != workflow.status.toUpperCase()) {
              restRequest({
                method: 'PUT',
                url: 'pipeline_execution/' + execution._id + "/status",
                data: {
                  'status': workflow.status.toUpperCase()
                }
              });
            }
          }.bind(this));
        }
      }.bind(this));
      resolve();
    }.bind(this));
  },

  getResults: function (pipeline_executions) {
    _.each(pipeline_executions, function (execution) {
      if (execution.status != this.statusKeys[4] && execution.status != this.statusKeys[5]) {
        this.carmin.getExecutionResults(execution.get('vipExecutionId'), function (results) {
          _.each(results, function (result) {

            // SCRIPT AVANT CHANGEMENT DE L'API VIP
            result = result.replace('/output.txt', '');
            result = result.replace('content', 'list');
            result = result.replace('?action=list', '');
            result = result.replace('http://vip.creatis.insa-lyon.fr/rest/path/', '');

            this.carmin.getFolderDetails(result, function (data) {
              _.each(data, function (res) {


                /*this.carmin.downloadFile(res.path, function (content) {
                  var fileName = res.path.substring(res.path.lastIndexOf('/') + 1);
                  var data = content;
                  var myFile = new File([data], fileName, {type:"application/octet-stream"});
                  var size = myFile.size;

                  console.log(data);
                  console.log(myFile);
                  console.log(size);


                  restRequest({
                    method: 'POST',
                    url: 'file?parentType=folder&parentId=' + execution.get('pathResultGirder') + '&name=' + fileName
                    + '&size=' + size,
                    data: myFile,
                    cache: false,
                    contentType: false,
                    processData: false,
                    encoding: null
                  }).done((resp) => {
                    //console.log(resp);
                  });

                });*/

              }.bind(this));
            }.bind(this));

            // SCRIPT APRES CHANGEMENT DE L'API VIP


          }.bind(this));
        }.bind(this));
      }
    }.bind(this));

    /*this.carmin.getExecutionResults(workflow.identifier, function (data) {
      _.each(data, function (result) {

        // SCRIPT AVANT LE CHANGEMENT DE L'API VIP
        result = result.replace('/output.txt', '');
        result = result.replace('content', 'list');
        result = result.replace('?action=list', '');
        result = result.replace('http://vip.creatis.insa-lyon.fr/rest/path/', '');


        this.carmin.getFolderDetails(result, function (data) {
          _.each(data, function (res) {
            this.carmin.downloadFile(res.path, function (content) {
              console.log(content);
            });
          }.bind(this));
        }.bind(this));

        // SCRIPT NON TESTE APRES LE CHANGEMENT DE L'API VIP

      }.bind(this));
    }.bind(this));*/
  }

});

export default MyPipelines;
