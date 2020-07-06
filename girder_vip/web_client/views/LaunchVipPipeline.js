// Import utilities
import events from '@girder/core/events';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest } from '@girder/core/rest';
import FolderModel from '@girder/core/models/FolderModel';
import ExecutionModel from '../models/ExecutionModel';
import { messageGirder, doVipRequest, useVipConfig, hasTheVipApiKeyConfigured, verifyApiKeysConfiguration } from '../utilities/vipPluginUtils';

// Import views
import View from '@girder/core/views/View';
import FileSelector from './FileSelector';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';
import { confirm } from '@girder/core/dialog';
import 'bootstrap/js/button';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';
import SuccessDialog from '../templates/executionSuccessDialog.pug';

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
      this.exitOnError('VIP execution page called without a pipeline');
      return ;
    }

    if (! hasTheVipApiKeyConfigured()) {
      this.exitOnError('You should have a VIP key configured to launch a VIP pipeline');
      return ;
    }

    this.pipeline = settings.pipeline;
    this.lastFile = settings.file;
    this.lastItem = settings.item;

    if (settings.vipConfigOk) {
      this.initInternal();
      return;
    }

    verifyApiKeysConfiguration({printWarning : true})
    .then(isOk => {
      if (isOk) {
        this.initInternal();
      } else {
        // warning already printed
        this.exitOnError('Configuration error, you cannot launch a VIP \
        execution. Please check your VIP API key configuration in your \
        girder account');
      }
    })
    .catch(error => {
      this.exitOnError('Cannot launch a VIP execution : ' + error);
    });
  },

  initInternal: function() {
    this.sortParameters();
    this.configureResultDirBrowser();
    this.paramValues = {};
    this.render();
    this.initChosenFile();
  },

  exitOnError: function(message) {
    messageGirder('danger', message);
    router.navigate('', {trigger: true});
  },

  render: function () {
    // Display the list of executions
    this.$el.html( LaunchTemplate({
      pipeline: this.pipeline,
      parameters: this.sortedParameters
    }) );

    return this;
  },

  initChosenFile: function() {
    if ( ! this.lastFile || ! this.lastItem) return;

    if (this.sortedParameters.file.length != 1) {
      // only preselect a file if there is exactly one
      return;
    }
    this.getResourcePath(this.lastFile).then((result) => {
      var param = this.sortedParameters.file[0];
      this.paramValues[param.pid] = {
        item: this.lastFile,
        file: this.lastFile
      };
      this.$('#vip-launch-' + param.pid).val(`${result}`);
    });

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
        this.resultFolder = folder;
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
    } else if ( this.lastFile && this.lastItem) {
      _.extend(settings, {
        defaultSelectedFile: this.lastFile,
        defaultSelectedItem: this.lastItem
      });
    }
    if (this.fileSelector) {
      this.stopListening(this.fileSelector);
      this.fileSelector.destroy();
    }
    this.fileSelector = new FileSelector(settings);
    this.fileSelector.on('g:saved', (item, file) => {
      this.onFileSelected(pid, item, file);
    });
  },

  onFileSelected: function(pid, item, file) {
    this.paramValues[pid] = {
      item: item,
      file: file
    };
    this.lastItem = item;
    this.lastFile = file;
    return this.getResourcePath(file).then((result) => {
      this.$('#vip-launch-' + pid).val(`${result}`);
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
    var isOk = this.validate();

    if (isOk) {
      this.launchExecution();
    } else {
      messageGirder('danger', 'Missing parameter(s) to launch this execution on VIP');
    }
  },

  validate: function() {
    this.$('.vip-launch-form-group').removeClass('has-success has-error');
    var isOk = true;
    isOk = this.validateParam('execution-name', this.executionName) && isOk;
    isOk = this.validateParam('result-dir', this.resultFolder) && isOk;

    var requiredParams = [].concat(
      this.sortedParameters.file,
      this.sortedParameters.required );
    _.each(requiredParams, p => {
      isOk = this.validateParam(p.pid) && isOk;
    });
    return isOk;
  },

  validateParam: function(paramId, paramValue) {
    paramValue = paramValue || this.paramValues[paramId];
    var isSuccess = !! paramValue;
    this.$('input#vip-launch-' + paramId).parents('.vip-launch-form-group')
      .addClass(isSuccess ? 'has-success' : 'has-error');
    return isSuccess;
  },

  launchExecution: function () {
    // Create result folder
    var createFolderPromise = this.createResultFolder(this.executionName, this.resultFolder);
    useVipConfig(createFolderPromise, (vipConfig, folder) => {
      var storageName = vipConfig.vip_external_storage_name;

      var execParams = this.buildVipParams(storageName);
      var resultsLocation = storageName + ":" + folder.id;

      return doVipRequest('initAndStart',
        this.executionName,
        this.pipeline.identifier,
        resultsLocation,
        execParams
      ).then(vipExec => {
        // enrich to save in girder later
        vipExec.girderResultFolder = folder;
        vipExec.execParams = execParams;
        return vipExec;
      });
    })
    // if it's OK, save it on girder, else show an error
    .then(vipExec => {
      // nested promise chain to seperate in case of girder error after vip success
      // so no return
      this.saveExecutionOnGirder(vipExec)
      .then( () => {
        // todo show modal and direct to my execution
        $('#g-dialog-container').html(SuccessDialog()).girderModal(false).one('hidden.bs.modal', function () {
          router.navigate('/my-executions', {trigger: true});
        });
      })
      .catch( e => {
        messageGirder("warning", "The execution is launched on VIP. \
          The results will be uploaded to girder but it will not be visible in \
          the 'My executions' menu (cause : " + e +  ")", 20000);
      });
    })
    .catch(error => {
      var msg = 'VIP error : ';
      if (error && error.errorCode) {
        msg += error.errorMessage + ' (code ' + error.errorCode + ')';
      } else {
        msg += error;
      }
      messageGirder("danger", msg);
      $('#run-execution').button('reset');
    });

    // Loading animation on the button
    messageGirder("info", "Launching execution, this could take a few seconds", 10000);
    $('#run-execution').button('loading');
  },

  createResultFolder: function (executionName, parentFolder) {
    var dateString = moment().format("YYYY/MM/DD HH:mm:ss");
    var folderName = "VIP Results - " + executionName + ' - ' + dateString;

    var folder = new FolderModel({
      parentType: 'folder',
      parentId: parentFolder.id,
      name: folderName
    });
    return folder.save().then(function () {return this;}.bind(folder));
  },

  buildVipParams: function(storageName) {
    var execParams = {};
    _.each(this.paramValues, (val, index) => {
      var param = this.pipeline.parameters[index];
      if (param.type == "File") {
        execParams[param.name] = storageName + ":" + val.file.id;
      } else if (val) {
        execParams[param.name] = val;
      }
    });
    return execParams;
  },

  saveExecutionOnGirder : function(vipExec) {
    var girderExec = new ExecutionModel({
      name: vipExec.name,
      fileId: JSON.stringify(vipExec.execParams),
      pipelineName: this.pipeline.name,
      vipExecutionId: vipExec.identifier,
      status: vipExec.status.toUpperCase(),
      idFolderResult: vipExec.girderResultFolder.id,
      sendMail: false,
      timestampFin: null
    });

    // Add this execution on Girder db
    return girderExec.save();
  },

}, {
    fetchAndInit: function (application, version) {
      if ( ! hasTheVipApiKeyConfigured()) {
        router.navigate('', {trigger: true});
        return;
      }
      doVipRequest('describePipeline', `${application}/${version}`)
      .then(pipeline => {
        events.trigger('g:navigateTo', LaunchVipPipeline, {
          pipeline: pipeline
        });
      })
      .catch(error => {
        messageGirder('danger', 'Wrong VIP pipeline (' + error + ')');
        router.navigate('', {trigger: true});
      });
    }
});

export default LaunchVipPipeline;
