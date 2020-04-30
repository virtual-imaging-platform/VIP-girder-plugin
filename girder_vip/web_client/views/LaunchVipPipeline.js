// Import utilities
import events from '@girder/core/events';

// Import views
import View from '@girder/core/views/View';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';

var LaunchVipPipeline = View.extend({
  initialize: function (settings) {
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
  }

}, {
    fetchAndInit: function (application, version) {
      events.trigger('g:navigateTo', CollectionView);
    }
});

export default LaunchVipPipeline;
