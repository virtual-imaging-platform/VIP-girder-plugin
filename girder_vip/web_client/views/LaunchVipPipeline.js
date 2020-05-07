// Import utilities
import events from '@girder/core/events';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest } from '@girder/core/rest';
import { messageGirder } from '../utilities/vipPluginUtils';

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
    if ( ! settings.pipeline) {
      messageGirder('danger', 'VIP execution page called without a pipeline');
      router.navigate('/', {trigger: true});
    }

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
      root: getCurrentUser(),
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
          this.$('#vip-launch-result-dir').val(`${result}`);
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

  resetFile: function (e) {
      this.selectedItem = null;
      this.selectedFile = null;
      this.render();
  }

}, {
    fetchAndInit: function (application, version) {
      doVipRequest('describePipeline', `${application}/${version}`)
      .then(pipeline => {
        events.trigger('g:navigateTo', LaunchVipPipeline, {
          pipeline: pipeline
        });
      }
      .catch(error => {
        messageGirder('danger', 'Wrong VIP pipeline (' + error + ')');
        router.navigate('/', {trigger: true});
      });
});

export default LaunchVipPipeline;
