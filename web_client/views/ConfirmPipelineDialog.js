// Import utilities
import _ from 'underscore';
import 'girder/utilities/jquery/girderModal';
import { restRequest } from 'girder/rest';
import events from 'girder/events';
import { Status } from '../constants';
import { checkRequestError, messageGirder, getTimestamp } from '../utilities';
import 'bootstrap/js/button';

// Import views
import View from 'girder/views/View';

// Import templates
import ConfirmPipelineDialogTemplate from '../templates/confirmPipelineDialog.pug';

var ConfirmPipelineDialog = View.extend({

  initialize: function (settings) {
    this.file = settings.file;
    this.currentPipeline = settings.pipeline;
    this.foldersCollection = settings.foldersCollection;
    this.carmin = settings.carmin;
    this.pathVIP = "/vip/Home/Girder/";
    this.filesInput = [this.file._id];
    this.parameters = {};

    // Trie le tableau foldersCollection en fonction de "path"
    this.foldersCollection.sort(function(a, b){
      return a.path.localeCompare(b.path)
    });

    this.render();
  },

  events: {
    'submit .creatis-launch-pipeline-form' : 'initPipeline'
  },

  render: function () {
    $('#g-dialog-container').html(ConfirmPipelineDialogTemplate({
      pipeline: this.currentPipeline,
      file: this.file,
      folders: this.foldersCollection
    })).girderModal(this);

    $('a[data-toggle="tab"]').click(function () {
      $(this).css('background-color', 'transparent');
    });

    return this;
  },

  initPipeline: function (e) {
    e.preventDefault();

    var nameExecution = $('#name-execution');
    var folderGirderDestination = $('#selectFolderDestination');
    var checkArg = 1;

    // General paramaters
    if (!nameExecution.val() || !folderGirderDestination.val()) {
      $('#tab-general').css('background-color', '#e2181852');
      checkArg = 0;
    }
    else {
      $('#tab-general').css('background-color', 'transparent');
    }

    // Required parameters
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
      return ;
    }

    // Loading animation on the button
    $('#run-pipeline').button('loading');

    // Path of folder process-timestamp
    var folderPath = this.pathVIP + "process-" + getTimestamp();

    // Check if the folder name "Girder" exists on VIP
    this.carmin.fileExists(this.pathVIP).then(function (data) {
      if (!data.exists) {
        return this.carmin.createFolder(this.pathVIP);
      } else {
        return Promise.resolve();
      }
    }.bind(this)).then(function (data) {
      if (!checkRequestError(data)) {
        this.sendFile(folderPath);
      }
    }.bind(this));
  },

  // TODO Promise composition
  sendFile: function (folderPath) {
    // Create folder to this process
    this.carmin.createFolder(folderPath).then(function (data) {
      if (!checkRequestError(data)) {
        // Send file into folder
        this.carmin.uploadData(folderPath + "/" + this.file.name, this.file.data).then(function (data) {
          if (!checkRequestError(data)) {
            this.launchPipeline(folderPath);
          }
        }.bind(this), function (error){
          this.messageDialog("danger", "There was a problem uploading the file to VIP");
          return;
        }.bind(this));
      }
    }.bind(this), function (data){
      this.messageDialog("danger", "The folder named 'Girder' could not be created");
    }.bind(this));
  },

  launchPipeline: function (folderPath) {
    var nameExecution = $('#name-execution').val();
    var folderGirderDestination = $('#selectFolderDestination').val();
    var sendMail = $('#send-email').is(':checked');
    var pathFileVIP = folderPath + "/" + this.file.name;

    // TODO : Améliorer les conditions pour éviter la foret de if
    // Fill paramaters
    _.each(this.currentPipeline.parameters, function(param) {
      if (param.name == "results-directory") {
        this.parameters[param.name] = folderPath;
      } else if (!(param.type == "File" && !param.defaultValue) && !param.defaultValue) { // condition bizarre à revoir
        this.parameters[param.name] = $('#'+param.name).val();
      } else if (param.type == 'File' && !param.defaultValue) {
        this.parameters[param.name] = folderPath + "/" + this.file.name;
      } else if ($('#advanced-' + param.name).val() && param.defaultValue){
        this.parameters[param.name] = $('#advanced-' + param.name).val();
      } else {
        this.parameters[param.name] = param.defaultValue;
      }
    }.bind(this));

    // Pour montrer à Sorina
    console.log(this);
    return;

    this.carmin.initAndStart(nameExecution, this.currentPipeline.identifier, this.parameters).then(function (data) {
      if (!checkRequestError(data)) {
        var filesInput = $.extend({}, this.filesInput);
        var params = {
          name: data.name,
          fileId: JSON.stringify(filesInput),
          pipelineName: this.currentPipeline.name,
          vipExecutionId: data.identifier,
          status: data.status.toUpperCase(),
          pathResultGirder: folderGirderDestination,
          childFolderResult: '',
          sendMail: sendMail,
          listFileResult: '{}',
          timestampFin: null,
          folderNameProcessVip: folderPath
        };

        restRequest({
          method: 'POST',
          url: 'pipeline_execution',
          data: params
        }).then(function (){
          this.messageDialog("success", "The execution is launched correctly");
        }.bind(this), function () {
          this.messageDialog("danger", "The execution is launched on VIP but we encounter a problem to fetch the informations about this execution");
        }.bind(this));
      }

    }.bind(this), function () {
      this.messageDialog("danger", "There was a problem launching the application");
    }.bind(this));
  },

  messageDialog: function(type, message) {
    $('#run-pipeline').button('reset');
    $('#g-dialog-container').find('a.close').click();
    messageGirder(type, message, 3000);
  }

});

export default ConfirmPipelineDialog;
