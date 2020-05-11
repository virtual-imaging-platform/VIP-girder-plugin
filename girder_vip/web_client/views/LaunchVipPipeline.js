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
    'click .vip-launch-file-btn': 'onFileBtnClick',
    'click #vip-launch-result-dir-btn': function() {
      this.resultFolderBrowser.setElement($('#g-dialog-container')).render();
    },
    'submit .vip-launch-pipeline-form' : 'submit',
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
      parameters: this.sortedParameters
    }) );

    return this;
  },

  sortParameters: function() {
    var sortedParameters = {
      file: [],
      required: [],
      optionalFile: [],
      optional: []
    };
    _.each(this.pipeline.parameters, (param, pid) => {
      param.pid = pid;
      if (param.name === 'results-directory') return;
      if (param.type == "File" && !param.defaultValue) {
        sortedParameters.file.push(param);
      } else if (!param.defaultValue) {
        sortedParameters.required.push(param);
      } else if (param.type == "File") {
        sortedParameters.optionalFile.push(param);
      } else {
        sortedParameters.optional.push(param);
      }
    });
    this.sortedParameters = sortedParameters
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

  onFileBtnClick: function (e) {
    var pid = $(e.currentTarget).attr("pid");
    var param = this.pipeline.parameters[pid];

    var settings = {
      el: $('#g-dialog-container'),
      parentView: this,
    };
    if (this.paramValues[pid]) {
      var paramData = this.paramValues[pid];
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
      this.paramValues[pid] = {
        item: item,
        file: file
      };
      this.getResourcePath(file).then((result) => {
        this.$('#vip-launch-' + pid).val(`${result}`);
      });
    });
  },

  getResourcePath: function(resource) {
    return restRequest({
        url: `resource/${resource.id}/path`,
        method: 'GET',
        data: { type: resource.get('_modelType') }
    })
  },

  submit: function(e) {
    // Cancel the button's action
    e.preventDefault();
    // get values
    // we already have all the files / folder in this.paramValues
    // fetch the text ones
    this.executionName = this.$('#vip-launch-execution-name').val();
    var textParams = [].concat(
      this.sortedParameters.required,
      this.sortedParameters.optional );
    _.each(textParams, p => {
      this.paramValues[p.pid] = this.$('#vip-launch-' + p.pid).val();
    });
    // now validate
    this.$('.vip-launch-form-group').removeClass('has-success has-error');
    var isOk = true;
    isOk = this.validateParam('execution-name', this.executionName) && isOk;
    isOk = this.validateParam('result-dir', this.resultFolderId) && isOk;

    var requiredParams = [].concat(
      this.sortedParameters.file,
      this.sortedParameters.required );
    _.each(requiredParams, p => {
      isOk = this.validateParam(p.pid) && isOk;
    });

    if (isOk) {
      messageGirder('success', 'YES !!');
    } else {
      messageGirder('danger', 'Missing parameter to launch this execution on VIP');
    }
  },

  validateParam: function(paramId, paramValue) {
    paramValue = paramValue || this.paramValues[paramId];
    var isSuccess = !! paramValue;
    this.$('input#vip-launch-' + paramId).parents('.vip-launch-form-group')
      .addClass(isSuccess ? 'has-success' : 'has-error');
    return isSuccess;
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
