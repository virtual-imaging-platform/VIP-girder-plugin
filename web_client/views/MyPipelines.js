// Import utilities
import { cancelRestRequests, restRequest } from 'girder/rest';
import _ from 'underscore';
import * as constants from '../constants';
import { getCurrentApiKeyVip } from '../utilities';
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

    // Get all pipeline executions
    restRequest({
      method: 'GET',
      url: 'pipeline_execution'
    }).then((resp) => {
      this.updateStatus(resp).then(function (){
        const promiseArray = [];
        setTimeout(function() {
            promiseArray.push(this.collection.fetch());
          $.when(...promiseArray).done(() => {
            this.listenTo(this.collection, 'g:changed', this.render);
            this.render();
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
        this.carmin.getExecution(execution.vipExecutionId, function (workflow) {
          if (execution.status != workflow.status.toUpperCase()) {
            restRequest({
              method: 'PUT',
              url: 'pipeline_execution/' + execution._id + "/status",
              data: {
                'status': workflow.status.toUpperCase()
              }
            });
          }
        });
      }.bind(this));
      resolve();
    }.bind(this));

  }

});

export default MyPipelines;
