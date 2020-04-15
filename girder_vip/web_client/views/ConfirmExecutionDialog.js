// Import utilities
import _ from 'underscore';
import moment from 'moment';
import { getCurrentUser} from '@girder/core/auth';
import { handleOpen } from '@girder/core/dialog';
import { messageGirder, verifyApiKeysConfiguration, fetchGirderFolders, getCarminClient} from '../utilities/vipPluginUtils';
//import 'bootstrap/js/button'; todo check if needed
import { VIP_EXTERNAL_STORAGE_NAME } from '../constants';
import FolderCollection from '@girder/core/collections/FolderCollection';
import ExecutionModel from '../models/models/ExecutionModel';

// Import views
import View from '@girder/core/views/View';
import LoadingAnimation from '@girder/core/views/widgets/LoadingAnimation';
import ListPipelinesWidget from './ListPipelinesWidget';
import '@girder/core/utilities/jquery/girderModal';

// Import templates
import ConfirmExecutionDialogTemplate from '../templates/confirmExecutionDialog.pug';

// Modal to fill parameters and launch the pipeline
var ConfirmExecutionDialog = View.extend({

  events: {
    'submit .creatis-launch-execution-form' : 'initExecution'
  },

  initialize: function (settings) {
    this.file = settings.file;
    this.item = settings.item;
    this.pipelines = settings.pipelines;
    this.pipeline = settings.pipeline;
    this.pipelineId = settings.pipelineId;

    this.initRoute();

    this.render();
    new LoadingAnimation({
        el: this.$('.modal-body'),
        parentView: this
    }).render();

    if (! this.pipeline && ! this.pipelineId) {
      messageGirder('danger', 'Missing information to launch a VIP pipeline');
      this.$el.modal('hide');
      return ;
    }

    (settings.vipConfigOk ?
      Promise.resolve(true)
      :
      verifyApiKeysConfiguration({printWarning : true})
    )
    .then((isOk) => {
      if (isOk) {
        return fetchPipelineIfNecessary()
        .then( () => fetchGirderFolders(getCurrentUser()))
        .then( userFolderGraph => {
          this.usersFolders = this.getUsersFolderWithIndent(userFolderGraph),
          this.render();
        });
      } else {
        // warning already printed
        this.$el.modal('hide');
      }
    })
    .catch(error => {
      messageGirder('danger', 'Cannot launch a VIP pipeline : ' + error);
      this.$el.modal('hide');
    });
  },

  render: function () {
    // Display the modal with the parameter of the pipeline selectionned
    this.$el.html(ConfirmExecutionDialogTemplate({
      pipeline: this.pipeline,
      file: this.file,
      folders: this.usersFolders ? this.usersFolders.models : false,
      authorizedForVersionOne: this.checkParametersForVersionOne()
    }));

    if (this.alreadyRendered) return this;

    this.alreadyRendered = true;
    this.$el.girderModal(this).on('hidden.bs.modal', () => {
      if (! this.goingToPipelineModal) {
        // reset route to the former one
        this.goToParentRoute();
      }
    });


    return this;
  },

  fetchPipelineIfNecessary: function() {
    if (this.pipeline) return Promise.resolve();

    return getCarminClient().describePipeline(this.pipelineId);
  },

  // Check the number of required parameters
  // If there is only one, the application can be started
  checkParametersForVersionOne: function () {
    if (! this pipeline) return false;
    var requiredFile = 0;
    _.each(this.pipeline.parameters, function (param) {
      if (param.type == "File" && !param.defaultValue)
        requiredFile++;
    });

    return (requiredFile <= 1) ? 1 : 0;
  },

  // todo refator this copy/paste from ListPipelineWidget
  initRoute: function() {
    this.route = Backbone.history.fragment
    var queryParams = parseQueryString(splitRoute(this.route).name);
    if (queryParams.dialog && queryParams.dialog == 'vip-launch') {
      // route already OK
      return;
    }
    var routeToAdd = '/file/' + this.file.id;
    if ( ! this.route.indexOf('item/')) {
      routeToAdd = '/item/' + this.item.id + '/' + route;
    }
    router.navigate(this.route + routeToAdd);
    handleOpen('vip-launch', {replace : true});
    this.route = Backbone.history.fragment;

  },

  goToParentRoute: function () {
    var currentRoute = Backbone.history.fragment;
    if (currentRoute === this.route) {
      // if the route has not already changed (back or loading custom url)
      router.navigate(this.parentView.getRoute(), {replace: ! this.execSuccess});
    }
  },

  getUsersFolderWithIndent: function(userFoldersGraph) {
    var folders = new FolderCollection();

    var adaptFolder = (folder) => {
      folder.model.set('indentText', "&nbsp;".repeat((folder.level - 1) * 3));
      folders.add(folder.model);
      _.each(folder.children, child => adaptFolder(child) );
    }

    _.each(userFoldersGraph.children, folder => adaptFolder(folder));

    return folders;
  },

  buildParameters: function (e) {
    // Cancel the button's action
    e.preventDefault();

    /*********************************/
    /* Check the required parameters */
    /*********************************/

    var allTabs = {ok : [], ko : []};
    var insertInTab = (isOk, el) => tabsOk[isOk ? 'ok' : 'ko'].push(el);

    // Check General paramaters
    var executionName = $('#name-execution').var();
    var girderFolderIndex = $('#selectFolderDestination').val();
    insertInTab(executionName && girderFolderIndex, this.$('#tab-general'));

    // Check pipeline parameters
    var execParams = {};
    var fileParam;
    _.each(this.pipeline.parameters, (param, index) => {
      var paramInput = this.$('#input-param-' + index);
      if (paramInput) {
        execParams[param.name] = paramInput.val();
        if ( ! paramInput.hasClass( "optional-vip-param" )) {
          insertInTab(paramInput.val(), this.$('#tab-param-' + index));
        }
      }
      if (param.type == "File" && !param.defaultValue) {
        fileParam = param;
      }
    });

    _.each(allTabs.ko, tab => {
      this.$('#tab-general').css('background-color', '#dc3545');
      this.$('#tab-general').css('color', '#fff');
    });

    _.each(allTabs.ok, tab => {
      this.$('#tab-general').css('background-color', '');
      this.$('#tab-general').css('color', '');
    });

    // If the required parameters are not fill
    if (allTabs.ko.length) {
      messageGirder("danger", "Missing parameter. Please fill in the form in each tab");
      return;
    }

    // Loading animation on the button
    messageGirder("info", "Launching execution, this could take a few seconds", 3000);
    $('#run-execution').button('loading');

    // If there aren't problems with the parameters
    this.launchExecution(executionName, this.usersFolder.at(girderFolderIndex), fileParam, execParams);
  },

  // Get the parameters and launch the execution
  launchExecution: function (executionName, girderFolder, fileParam, execParams) {

    // Create result folder
    this.createResultFolder(executionName, girderFolder)
    .then( folder => {

      execParams[fileParam] = VIP_EXTERNAL_STORAGE_NAME + "/" + this.file.id;
      var resultsLocation = VIP_EXTERNAL_STORAGE_NAME + "/" + folder.id;

      return getCarminClient().initAndStart(
        nameExecution,
        this.pipeline.identifier,
        resultsLocation,
        execParams
      ).then(vipExec => {
        vipExec.gilderResultFolder = folder;
        return vipExec;
      });
    })
    // if it's OK, save it on girder, else show an error
    .then(vipExec => {
      // nested promise chain to seperate in case of girder error after vip success
      // so no return
      saveExecutionOnGirder(vipExec, fileParam)
      .then( () => {
        messageGirder("success", "The execution is launched correctly");
        this.execSuccess = true;
        this.$el.modal('hide');
      })
      .catch( e => {
        messageGirder("warning", "The execution is launched on VIP. \
          The results will be uploaded to girder but it will not be visible in \
          the 'My executions' menu (cause : " + error +  ")", 10000);
        $('#run-execution').button('reset');
      });
    )
    .catch(error => {
      var msg = 'VIP error : ';
      if (data && data.errorCode) {
        msg += data.errorMessage + ' (code ' + data.errorCode + ')');
      } else {
        msg += error;
      }
      messageGirder("danger", msg);
      $('#run-execution').button('reset');
    });
  },

  createResultFolder: function (executionName, parentFolder) {
    var dateString = moment().format("YYYY/MM/DD HH:mm:ss");
    var folderName = "VIP Results - " + executionName + dateString;

    var folder = new FolderModel({
      parentType: 'folder',
      parentId: parentFolder.id,
      name: folderName
    });
    return folder.save().then(function () {return this;}.bind(folder));
  },

  saveExecutionOnGirder : function(vipExec, fileParam) {
    var girderExec = new ExecutionModel({
      name: vipExec.name,
      fileId: JSON.stringify({fileParam : this.file.id}}),
      pipelineName: this.pipeline.name,
      vipExecutionId: vipExec.identifier,
      status: vipExec.status.toUpperCase(),
      idFolderResult: vipExec.gilderResultFolder.id,
      sendMail: false,
      timestampFin: null
    });

    // Add this execution on Girder db
    return girderExec.save();
  },

  goToPipelineModal: function() {
    this.goingToPipelineModal = true;

    new ListPipelinesWidget({
        el: $('#g-dialog-container'),
        file: this.file,
        item: this.item,
        pipelines: this.pipelines,
        parentView: this.parentView
    });
  }

  // todo : check if needed
  /*
  messageDialog: function(type, message) {
    $('#run-execution').button('reset');
    $('#g-dialog-container').find('a.close').click();
    messageGirder(type, message, 3000);
  },
  */
});

export default ConfirmExecutionDialog;
