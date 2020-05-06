// Import utilities
import events from '@girder/core/events';

// Import views
import View from '@girder/core/views/View';
import FileSelector from './FileSelector';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';

var LaunchVipPipeline = View.extend({
  initialize: function (settings) {
    this._fileSelector = new FileSelector({
      parentView: this
    })
    this.render();
  },

  events: {
    'click .select-girder-file' : 'chooseFile',
    'click .reset-girder-file' : 'resetFile'
  },

  render: function () {
    // Display the list of executions
    this.$el.html( LaunchTemplate({
      selectedFile: this.selectedFile,
      selectedItem: this.selectedItem
    }) );

    return this;
  },

  // Delete a executon of the db
  chooseFile: function (e) {
    if (this.selectedFile) {
      this._fileSelector = new FileSelector({
        parentView: this,
        defaultSelectedFile: this.selectedFile,
        defaultSelectedItem: this.selectedItem
      })
    }
    this._fileSelector.on('g:saved', (selectedItem, selectedFile) => {
      this.selectedItem = selectedItem;
      this.selectedFile = selectedFile;
      this.render();
    });
    this._fileSelector.setElement($('#g-dialog-container')).render();
  },

  // Delete a executon of the db
  resetFile: function (e) {
      this.selectedItem = null;
      this.selectedFile = null;
      this.render();
  }

}, {
    fetchAndInit: function (application, version) {
      events.trigger('g:navigateTo', LaunchVipPipeline);
    }
});

export default LaunchVipPipeline;
