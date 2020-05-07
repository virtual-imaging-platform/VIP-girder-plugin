// Import utilities
import events from '@girder/core/events';

// Import views
import View from '@girder/core/views/View';
import FileSelector from './FileSelector';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';

// reuse system config style to separate input sections
import '@girder/core/stylesheets/body/systemConfig.styl';

var LaunchVipPipeline = View.extend({

  events: {
    'click .select-girder-file' : 'chooseFile',
    'click .reset-girder-file' : 'resetFile',
    'click #vip-launch-result-dir-btn': function() {
      this.resultFolderBrowser.setElement($('#g-dialog-container')).render();
    }
  },

  initialize: function (settings) {
    this.configureResultDirBrowser();
    this.render();
  },

  configureResultDirBrowser: function() {
    this.resultFolderBrowser = new BrowserWidget({
      parentView: this,
      titleText: 'Vip execution result folder',
      helpText: 'Browse to a folder to select it as the destination.',
      submitText: 'Select folder',
      rootSelectorSettings: { display: ['Home'] },
      validate: function (model) {
        if (!model) {
          return Promise.reject('Please select a folder.');
        }
        return Promise.resolve();
      }
    });
    this.listenTo(this.resultFolderBrowser, 'g:saved', function (folder) {
        this.resultFolderId = folder.id;
        this.$('#vip-launch-result-dir').val(folder.id);
        restRequest({
            url: `resource/${folder.id}/path`,
            method: 'GET',
            data: { type: 'folder' }
        }).done((result) => {
          this.$('#vip-launch-result-dir').val(`${folder.id} (${result})`);
        });
    });
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
    var settings = {
      el: $('#g-dialog-container'),
      parentView: this,
    };
    if (this.selectedFile) {
      _.extend(settings, {
        defaultSelectedFile: this.selectedFile,
        defaultSelectedItem: this.selectedItem
      });
    }
    this._fileSelector = new FileSelector(settings);
    this._fileSelector.on('g:saved', (selectedItem, selectedFile) => {
      this.selectedItem = selectedItem;
      this.selectedFile = selectedFile;
      this.render();
    });
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
