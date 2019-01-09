// Import utilities
import _ from 'underscore';
import 'girder/utilities/jquery/girderModal';
import { restRequest, getApiRoot } from 'girder/rest';
import events from 'girder/events';
import { Status } from '../constants';
import { getCurrentUser} from 'girder/auth';
import { checkRequestError, messageGirder, getTimestamp,
  createOrVerifyPluginApiKey, createNewToken } from '../utilities';
import 'bootstrap/js/button';

// Import views
import View from 'girder/views/View';

// Import templates
import ConfirmExecutionDialogTemplate from '../templates/confirmExecutionDialog.pug';

// Modal to fill parameters and launch the pipeline
var ConfirmExecutionDialog = View.extend({

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

    // verify that the api key is OK
    createOrVerifyPluginApiKey(getCurrentUser())
    .then( () => $('#run-execution').prop("disabled", false) )
    .catch(e => {
      console.log(e);
      messageGirder("warning", "There is a problem with the Girder API key. \
        Please correct it and come back");
    });

    this.render();
  },

  events: {
    'submit .creatis-launch-execution-form' : 'initExecution'
  },

  render: function () {
    // Display the modal with the parameter of the pipeline selectionned
    $('#g-dialog-container').html(ConfirmExecutionDialogTemplate({
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

  initExecution: function (e) {
    // Cancel the button's action
    e.preventDefault();


    var nameExecution = $('#name-execution');
    var folderGirderDestination = $('#selectFolderDestination');
    var checkArg = 1;

    if (!getApiRoot()) {
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
    $('#run-execution').button('loading');

    // If there aren't problems with the parameters
    this.launchExecution();
  },

  // Get the parameters and launch the execution
  launchExecution: function () {
    var nameExecution = $('#name-execution').val();
    var folderGirderDestination = $('#selectFolderDestination').val();
    this.sendMail = $('#send-email').is(':checked');

    // begining of the promise chain
    // always use arrow functions to keep "this"
    // Create result folder
    this.createResultFolder(nameExecution, folderGirderDestination)
    .then( folder => this.folderResultId = folder._id)
    .then( () => createNewToken(getCurrentUser()) )
    .then( token => {
      this.token = token;

      // Map input with application parameters
      _.each(this.currentPipeline.parameters, param => {
        if (param.name == "results-directory") {
          this.parameters[param.name] = this.constructApiUri("/Currently/Unused", this.folderResultId);
        } else if (!(param.type == "File" && !param.defaultValue) && !param.defaultValue) {
          this.parameters[param.name] = $('#'+param.name).val();
        } else if (param.type == "File" && !param.defaultValue) {
          this.parameters[param.name] = this.constructApiUri("/" + this.file.name, this.filesInput[0]);
        } else if ($('#advanced-' + param.name).val() && param.defaultValue) {
          this.parameters[param.name] = $('#advanced-' + param.name).val();
        } else {
          this.parameters[param.name] = param.defaultValue;
        }
      });

      // Launch the execution
      return this.carmin.initAndStart(
        nameExecution,
        this.currentPipeline.identifier,
        this.parameters);
    })
    .then(data => {
      if (checkRequestError(data)) {
        Promise.reject("VIP returned an error, please contact the vip admins")
      } else {
        return data;
      }
    })
    // if it's OK, save it on girder, else show an error
    .then(
      // nested promise chain
      data => { return Promise.resolve(data)
        // need to initilize a promise chain, otherwise an error in
        // saveExecutionOnGirder isnt' catch in this chain
        .then(this.saveExecutionOnGirder(data))
        .then( () => this.messageDialog("success", "The execution is launched correctly"))
        .catch( e => {
          console.log(e);
          this.messageDialog("danger", "The execution is launched on VIP but we encounter a problem to fetch the informations about this execution");
        });
      }, e => {
        console.log(e);
        this.messageDialog("danger", "There was a problem launching the application");
      }
    );
  },

  saveExecutionOnGirder : function(data) {
    // the execution was launched successly
    var filesInput = $.extend({}, this.filesInput);
    var params = {
      name: data.name,
      fileId: JSON.stringify(filesInput),
      pipelineName: this.currentPipeline.name,
      vipExecutionId: data.identifier,
      status: data.status.toUpperCase(),
      idFolderResult: this.folderResultId,
      sendMail: this.sendMail,
      timestampFin: null
    };

    // Add this execution on Girder db
    return restRequest({
      method: 'POST',
      url: 'vip_execution',
      data: params
    });
  },

  constructApiUri: function(filePath, fileId) {
    // Get the server URL and protocol
    var url = window.location.href;
    var protocol = url.split("://");
    protocol = protocol[0];

    // create the base uri
    return "girder:" + filePath + "?"
          + "apiurl=" + protocol + "://" + location.host + "/" + getApiRoot()
          + "&amp;token=" + this.token
          + "&amp;fileId=" + fileId;
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

  // Create the result folder
  createResultFolder: function (nameExecution, idParentFolder) {
    return restRequest({
      method: 'POST',
      url: 'folder',
      data: {
        parentType: 'folder',
        parentId: idParentFolder,
        name: this.getResultFolderName(nameExecution)
      }
    });
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
    $('#run-execution').button('reset');
    $('#g-dialog-container').find('a.close').click();
    messageGirder(type, message, 3000);
  },

});

export default ConfirmExecutionDialog;
