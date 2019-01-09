// Import utilities
import _ from 'underscore';
import { cancelRestRequests, restRequest } from 'girder/rest';
import * as constants from '../constants';
import { getCurrentApiKeyVip, messageGirder } from '../utilities';
import { getCurrentUser } from 'girder/auth';
import CarminClient from '../vendor/carmin/carmin-client';

// Import views
import View from 'girder/views/View';

// Import collections
import ExecutionCollection from '../collections/ExecutionCollection';

// Import templates
import MyExecutionsTemplate from '../templates/myExecutions.pug';

// Import stylesheets
import '../stylesheets/myExecutions.styl';

var MyExecutions = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    // Get the api key of VIP
    var apiKeyVip = getCurrentApiKeyVip();
    if (apiKeyVip == null) {
      return ;
    }

    this.carmin = new CarminClient(constants.carminURL, apiKeyVip);

    // Get all executions
    restRequest({
      method: 'GET',
      url: 'vip_execution'
    }).then(executions => {
      return this.updateStatus(executions);
    }).then(executions => {
      this.render(executions);
    });

  },

  events: {
    'click .deleteExecution' : 'deleteExecution'
  },

  render: function (executions) {
    // use ExecutionCollection to sort the executions
    var sortedExecutions = new ExecutionCollection(executions).toJSON();
    // Display the list of executions
    this.$el.html(MyExecutionsTemplate({
      executions: sortedExecutions,
      status: constants.Status,
      user: getCurrentUser()
    }));

    return this;
  },

  // Get the status of the executon VIP side. If the status is different from the girder side, update it.
  updateStatus: function (executions) {
    const promiseArray = [];

    // For each executions
    for (let execution of executions) {
      var executionStatus = execution.status;
      if (! constants.Status[executionStatus]) {
        // the status is unknown, report an error
        messageGirder("warning", "Unkown status : " + executionStatus);
      } else if (constants.Status[executionStatus].order < 25) {
        // the execution wasn't finished at the last check, check again
        promiseArray.push(
          this.carmin.getExecution(execution.vipExecutionId)
          .then(workflow => {
            if (execution.status != workflow.status.toUpperCase()) {
              execution.status = workflow.status.toUpperCase();
              return restRequest({
                method: 'PUT',
                url: 'vip_execution/' + execution._id + "/status",
                data: { 'status': execution.status }
              })
              // the promise must return the updated execution
              .then(execution);
            } else {
              // nothing to do but forward the execution to be rendered
              return execution;
            }
          })
        );
      } else {
        // nothing to do but forward the execution to be rendered
        promiseArray.push(execution);
      }
    }

    return Promise.all(promiseArray);
  },

  // Delete a executon of the db
  deleteExecution: function (e) {
    var buttonDelete = $(e.currentTarget);
    var id = buttonDelete.val();

    if (id) {
      restRequest({
        method: 'DELETE',
        url: 'vip_execution/' + id
      }).done(() => {
        var execution = buttonDelete.closest('tr.execution');

        $(execution).addClass('removed-execution').one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function (e) {
          $(execution).remove();
        });
      });
    }
  }

});

export default MyExecutions;
