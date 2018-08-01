// Import utilities
import _ from 'underscore';
import 'girder/utilities/jquery/girderModal';
import { restRequest, getApiRoot } from 'girder/rest';
import events from 'girder/events';
import { Status } from '../constants';
import { getCurrentUser, getCurrentToken } from 'girder/auth';
import { checkRequestError, messageGirder, getTimestamp, createNewToken } from '../utilities';
import 'bootstrap/js/button';

// Import views
import View from 'girder/views/View';

// Import templates
import ConfirmPipelineDialogTemplate from '../templates/confirmPipelineDialog.pug';

// Modal to fill parameters and launch the pipeline
var ConfirmPipelineDialog = View.extend({

  initialize: function (settings) {
    this.file = settings.file;
    this.currentPipeline = settings.pipeline;
    this.foldersCollection = settings.foldersCollection;
    this.carmin = settings.carmin;
    this.pathVIP = "/vip/Home/Girder/";
    this.filesInput = [this.file._id];
    this.parameters = {};

    // Sort the foldersCollection array according to "path" (parameter "resultDirectory")
    this.foldersCollection.sort(function(a, b){
      return a.path.localeCompare(b.path)
    });

    // Get the current user's token
    if (!(this.currentToken = getCurrentToken())) {
      createNewToken(getCurrentUser()).then(function (resp) {
        this.currentToken = resp;
      }.bind(this));
    }

    this.render();
  },

  events: {
    'submit .creatis-launch-pipeline-form' : 'initPipeline'
  },

  render: function () {
    // Display the modal with the parameter of the pipeline selectionned
    $('#g-dialog-container').html(ConfirmPipelineDialogTemplate({
      pipeline: this.currentPipeline,
      file: this.file,
      folders: this.foldersCollection,
      authorizedForVersionOne: this.checkParametersForVersionOne(this.currentPipeline.parameters)
    })).girderModal(this);

    // Tab of parameters
    $('a[data-toggle="tab"]').click(function () {
      $(this).css('background-color', 'transparent');
    });

    return this;
  },

  initPipeline: function (e) {
    // Cancel the button's action
    e.preventDefault();


    var nameExecution = $('#name-execution');
    var folderGirderDestination = $('#selectFolderDestination');
    var checkArg = 1;

    if (!this.currentToken && !getApiRoot()) {
      this.messageDialog("danger", "A problem with your session has occurred");
    }

    /*********************************/
    /* Check the required parameters */
    /*********************************/

    // Check General paramaters
    if (!nameExecution.val() || !folderGirderDestination.val()) {
      $('#tab-general').css('background-color', '#e2181852');
      checkArg = 0;
    }
    else {
      $('#tab-general').css('background-color', 'transparent');
    }

    // Check pipeline parameters
    _.each(this.currentPipeline.parameters, function(param) {
      var e = $('#' + param.name);
      if (e.length > 0 && !e.val()) { // If the parameter exists in the DOM but is empty
        $('#tab-' + param.name).css('background-color', '#e2181852');
        checkArg = 0;
      }
      else if (e.length > 0 && e.val()) {
        $('#tab-' + param.name).css('background-color', 'transparent');
      }
    }.bind(this));

    // If the required parameters are not fill
    if (!checkArg) {
      messageGirder("danger", "Please fill in the form in each tab", 2000);
      return ;
    }

    // Loading animation on the button
    messageGirder("info", "Loading...", 1000);
    $('#run-pipeline').button('loading');

    // If there aren't problems with the parameters
    this.launchPipeline();
  },

  // Get the parameters and launch the execution
  launchPipeline: function () {
    var nameExecution = $('#name-execution').val();
    var folderGirderDestination = $('#selectFolderDestination').val();
    var sendMail = $('#send-email').is(':checked');
    var baseURI = "girder://" + this.currentToken + "@" + location.host + "/" + getApiRoot();

    // Get the server URL and protocol
    var url = window.location.href;
    var protocol = url.split("://");
    protocol = protocol[0];

    // Create result folder
    var promiseNewFolder = this.createResultFolder(nameExecution, folderGirderDestination);

    // Init execution when the result directory is created
    var promiseInitExecution = promiseNewFolder.then(function (folderResultId) {
      this.folderResultId = folderResultId;

      // Map input with application parameters
      _.each(this.currentPipeline.parameters, function (param) {
        if (param.name == "results-directory") {
          this.parameters[param.name] = baseURI + "?folderId=" + folderResultId + "&amp;hostProto=" + protocol;
        } else if (!(param.type == "File" && !param.defaultValue) && !param.defaultValue) {
          this.parameters[param.name] = $('#'+param.name).val();
        } else if (param.type == "File" && !param.defaultValue) {
          this.parameters[param.name] = baseURI + "?fileId=" + this.filesInput[0] + "&amp;hostProto=" + protocol + "&amp;fileName=/" + this.file.name;
        } else if ($('#advanced-' + param.name).val() && param.defaultValue) {
          this.parameters[param.name] = $('#advanced-' + param.name).val();
        } else {
          this.parameters[param.name] = param.defaultValue;
        }
      }.bind(this));

      // Launch the execution
      return this.carmin.initAndStart(nameExecution, this.currentPipeline.identifier, this.parameters);

    }.bind(this), function () {
      this.messageDialog("danger", "There was a problem launching the application");
    });

    // If the execution is launched correctly VIP side, add this execution on Girder db
    promiseInitExecution.then(function (data) {
      if (!checkRequestError(data)) {
        var filesInput = $.extend({}, this.filesInput);
        var params = {
          name: data.name,
          fileId: JSON.stringify(filesInput),
          pipelineName: this.currentPipeline.name,
          vipExecutionId: data.identifier,
          status: data.status.toUpperCase(),
          idFolderResult: this.folderResultId,
          sendMail: sendMail,
          listFileResult: '{}',
          timestampFin: null
        };

        // Add this execution on Girder db
        return restRequest({
          method: 'POST',
          url: 'pipeline_execution',
          data: params
        });
      }
    }.bind(this)).then(function (){
      this.messageDialog("success", "The execution is launched correctly");
    }.bind(this), function () {
      this.messageDialog("danger", "The execution is launched on VIP but we encounter a problem to fetch the informations about this execution");
    }.bind(this));
  },

  // Check the number of required parameters
  // If there is only one, the application can be started
  checkParametersForVersionOne: function (parameters) {
    var requiredFile = 0;
    _.each(parameters, function (param) {
      if (param.type == "File" && !param.defaultValue)
        requiredFile++;
    });

    return (requiredFile <= 1) ? 1 : 0;
  },

  // Create the result folder before send the parameters and init the pipeline
  createResultFolder: function (nameExecution, idParentFolder) {
    return new Promise(function (resolve, reject) {
      restRequest({
        method: 'POST',
        url: 'folder',
        data: {
          parentType: 'folder',
          parentId: idParentFolder,
          name: this.getResultFolderName(nameExecution)
        }
      }).then(function (resp) {
        resolve(resp._id);
      }, function () {
        reject();
      });
    }.bind(this));
  },

  getResultFolderName: function (nameExecution) {
    var date = new Date();
    var folderName = "Results - " + nameExecution + ' - ' + date.getFullYear() + '/'
    + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes()
    + ':' + date.getSeconds();

    return folderName;
  },

  // For each error
  messageDialog: function(type, message) {
    $('#run-pipeline').button('reset');
    $('#g-dialog-container').find('a.close').click();
    messageGirder(type, message, 3000);
  },

});

export default ConfirmPipelineDialog;
