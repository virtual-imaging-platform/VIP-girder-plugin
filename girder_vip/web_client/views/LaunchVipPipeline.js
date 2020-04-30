// Import utilities
import events from '@girder/core/events';

// Import views
import View from '@girder/core/views/View';
import FileSelectorModal from './FileSelectorModal';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';

var LaunchVipPipeline = View.extend({
  initialize: function (settings) {

    this._browserWidgetView = new BrowserWidget({
          parentView: this,
          selectItem: true
      });
    this.render();
  },

  events: {
    'click .select-girder-file' : 'chooseFile'
  },

  render: function (executions) {
    // Display the list of executions
    this.$el.html( LaunchTemplate() );

    return this;
  },

  // Delete a executon of the db
  chooseFile: function (e) {
      this._browserWidgetView.setElement($('#g-dialog-container')).render();
  }

}, {
    fetchAndInit: function (application, version) {
      events.trigger('g:navigateTo', LaunchVipPipeline);
    }
});

export default LaunchVipPipeline;
