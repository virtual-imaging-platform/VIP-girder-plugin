// Import utilities
import _ from 'underscore';
import moment from 'moment';
import router from '@girder/core/router';
import * as constants from '../constants';
import events from '@girder/core/events';
import { hasTheVipApiKeyConfigured, messageGirder, doVipRequest } from '../utilities/vipPluginUtils';
import { getCurrentUser } from '@girder/core/auth';

// Import views
import { confirm } from '@girder/core/dialog';
import View from '@girder/core/views/View';

// Import collections
import ExecutionCollection from '../collections/ExecutionCollection';

// Import templates
import MyExecutionsTemplate from '../templates/myExecutions.pug';

var MyExecutions = View.extend({
  initialize: function (settings) {

    if ( ! hasTheVipApiKeyConfigured() ) {
      return;
    }

    this.girderExecs = new ExecutionCollection();
    this.girderExecs.on('g:changed', () => {
      this.updateAllExecutions()
      .then( () => this.render() );
    }).fetch();

  },

  events: {
    'click .deleteExecution' : 'deleteExecution',
    'click .see-results' : 'seeResults',
    'click .refresh-executions' : 'refreshExecutions'
  },

  render: function (executions) {
    // Display the list of executions
    this.$el.html(MyExecutionsTemplate({
      executions: this.getFormattedGirderExecutions(),
      status: constants.STATUSES
    }));

    return this;
  },

  // Get the status of the executon VIP side. If the status is different from the girder side, update it.
  updateAllExecutions: function () {

    var allPromises = this.girderExecs.chain()
    .filter(ex => {
      if (! constants.STATUSES[ex.get('status')]) {
        messageGirder("warning", "Unkown status for " + ex.get('name') + ' : ' + ex.get('status'));
        return false;
      }
      return constants.STATUSES[ex.get('status')].order < 25
    })
    .map( ex => this.updateExecution(ex) )
    .value();

    return Promise.all(allPromises);
  },

  getFormattedGirderExecutions: function() {
    return this.girderExecs.each( girderExec => {
      var m = moment.unix(girderExec.get('timestampCreation'));
      girderExec.set('creationDate', m.format("YYYY/MM/DD HH:mm:ss"));
      girderExec.set('isFinished', girderExec.get('status') == 'FINISHED');
    });
  },

  updateExecution: function(girderExec) {
    return doVipRequest('getExecution', girderExec.get('vipExecutionId'))
    .then(vipExec => {
      if (girderExec.get('status') == vipExec.status.toUpperCase()) {
        return;
      }
      girderExec.set('status', vipExec.status.toUpperCase());
      return girderExec.saveStatus();
    })
    .catch(error => {
      messageGirder("warning", "Error updating information for execution ''\
       " + girderExec.get('name') + '\'.');
    });
  },

  // Delete a executon of the db
  deleteExecution: function (e) {
    var cid = $(e.currentTarget).parents('.g-execution').attr('cid');

    confirm({
      text: 'This will delete this execution from this list, not from VIP \
              and it won\'t delete any file on girder.',
      yesText: 'Delete',
      confirmCallback: () => {
          this.girderExecs.get(cid).destroy().then( () => {
              events.trigger('g:alert', {
                  icon: 'ok',
                  text: 'Execution deleted.',
                  type: 'success',
                  timeout: 3000
              });
              this.render();
          });
      }
    });
  },

  // Delete an executon of the db
  seeResults: function (e) {
    var cid = $(e.currentTarget).parents('.g-execution').attr('cid');
    this.girderExecs.get(cid)

    router.navigate(
      'folder/' + this.girderExecs.get(cid).get('idFolderResult'),
      { trigger: true }
    );
  },

  // Delete a executon of the db
  refreshExecutions: function (e) {
    this.girderExecs.fetch();
  }

});

export default MyExecutions;
