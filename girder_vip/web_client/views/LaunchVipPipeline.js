// Import utilities
import events from '@girder/core/events';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest } from '@girder/core/rest';
import { messageGirder, doVipRequest } from '../utilities/vipPluginUtils';

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
    'click .vip-launch-file-btn': function(e) {
      this.onFileBtnClick(e, true));
    },
    'click .vip-launch-optional-file-btn': function(e) {
      this.onFileBtnClick(e, false));
    },
    'click #vip-launch-result-dir-btn': function() {
      this.resultFolderBrowser.setElement($('#g-dialog-container')).render();
    }
  },

  initialize: function (settings) {
    if ( ! settings.pipeline) {
      messageGirder('danger', 'VIP execution page called without a pipeline');
      router.navigate('/', {trigger: true});
    }
    this.pipeline = settings.pipeline;
    this.sortParameters();
    this.configureResultDirBrowser();
    this.paramValues = {};
    this.render();
  },

  render: function () {
    // Display the list of executions
    this.$el.html( LaunchTemplate({
      pipeline: this.pipeline,
      parameters: this.parameters
    }) );

    return this;
  },

  sortParameters: function() {
    var parameters = {
      file: [],
      required: [],
      optionalFile: [],
      optional: []
    };
    _.each(this.pipeline.parameters, function (param) {
      if (param.name === 'results-directory') return;
      if (param.type == "File" && !param.defaultValue) {
        parameters.file.push(param);
      } else if (!param.defaultValue) {
        parameters.required.push(param);
      } else if (param.type == "File") {
        parameters.optionalFile.push(param);
      } else {
        parameters.optional.push(param);
      }
    });
    this.parameters = parameters;
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
        this.getResourcePath(folder).then((result) => {
          this.$('#vip-launch-result-dir').val(`${result}`);
        });
    });
  },

  onFileBtnClick: function (e, required) {
    var paramIndex = $(e.currentTarget).attr("param-index");
    var param = this.parameters[ required ? 'file' : 'optionalFile'][paramIndex];

    var settings = {
      el: $('#g-dialog-container'),
      parentView: this,
    };
    if (this.paramValues[param.name]) {
      var paramData = this.paramValues[param.name];
      _.extend(settings, {
        defaultSelectedFile: paramData.file,
        defaultSelectedItem: paramData.item
      });
    }
    if (this.fileSelector) {
      this.stopListening(this.fileSelector);
      this.fileSelector.destroy();
    }
    this.fileSelector = new FileSelector(settings);
    this.fileSelector.on('g:saved', (item, file) => {
      this.paramValues[param.name] = {
        item: item,
        file: file
      };
      this.getResourcePath(file).then((result) => {
        var elementId = required ?
          '#vip-launch-file' + paramIndex :
          '#vip-launch-optional-file' + paramIndex;
        this.$(elementId).val(`${result}`);
      });
    });
  },

  getResourcePath: function(resource) {
    restRequest({
        url: `resource/${resource.id}/path`,
        method: 'GET',
        data: { type: resource.get('_modelType') }
    })
  }

}, {
    fetchAndInit: function (application, version) {
      doVipRequest('describePipeline', `${application}/${version}`)
      .then(pipeline => {
        events.trigger('g:navigateTo', LaunchVipPipeline, {
          pipeline: pipeline
        });
      })
      .catch(error => {
        messageGirder('danger', 'Wrong VIP pipeline (' + error + ')');
        router.navigate('/', {trigger: true});
      });
    }
});

export default LaunchVipPipeline;
