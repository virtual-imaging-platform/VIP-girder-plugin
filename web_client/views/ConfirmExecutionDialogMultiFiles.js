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
import ConfirmExecutionDialogTemplate from '../templates/confirmExecutionDialog.pug';

var ConfirmExecutionDialog = View.extend({

  initialize: function (settings) {
    this.files = settings.files;
    this.filesCount = settings.filesCount;
    this.currentPipeline = settings.pipeline;
    this.foldersCollection = settings.foldersCollection;
    this.carmin = settings.carmin;
    this.pathVIP = "/vip/Home/Girder/";
    //this.filesInput = [this.file._id];
    this.parameters = {};

    // Trie le tableau foldersCollection en fonction de "path"
    this.foldersCollection.sort(function(a, b){
      return a.path.localeCompare(b.path)
    });

    this.render();
  },

  events: {
    'submit .creatis-launch-execution-form' : 'initExecution'
  },

  render: function () {
    $('#g-dialog-container').html(ConfirmExecutionDialogTemplate({
      pipeline: this.currentPipeline,
      filesCount: this.filesCount,
      folders: this.foldersCollection
    })).girderModal(this);

    $('a[data-toggle="tab"]').click(function () {
      $(this).css('background-color', 'transparent');
    });

    return this;
  },

  initExecution: function (e) {
    e.preventDefault();

    var nameExecution = $('#name-execution');
    var folderGirderDestination = $('#selectFolderDestination');
    var checkArg = 1;

    if (!nameExecution.val() || !folderGirderDestination.val()) {
      $('#tab-general').css('background-color', '#e2181852');
      checkArg = 0;
    }
    else
      $('#tab-general').css('background-color', 'transparent');

    _.each(this.currentPipeline.parameters, function(param) {
      var e = $('#' + param.name)
      if (e.length > 0 && !e.val()) { // If the parameter exists in the DOM but is empty
        $('#tab-' + param.name).css('background-color', '#e2181852');
        checkArg = 0
      }
      else if (e.length > 0 && e.val())
        $('#tab-' + param.name).css('background-color', 'transparent');
    }.bind(this));

    if (!checkArg)
      return ;

    $('#run-execution').button('loading');

    var folderPath = this.pathVIP + "process-" + getTimestamp();

    // TODO Promise composition
    // Check if Girder folder exists
    this.carmin.fileExists(this.pathVIP).then(function (data) {
      if (!data.exists) {
        this.carmin.createFolder(this.pathVIP).then(function (data) {
          if (!checkRequestError(data)) {
            this.sendMultipleFiles(folderPath);
          }
        }.bind(this));
      } else {
        this.sendMultipleFiles(folderPath);
      }
    }.bind(this));
  },

  sendMultipleFiles: function (folderPath) {
    _.each(this.files, function (file) {
      console.log(file.data);
    });
    // Create folder to this process
    // this.carmin.createFolder(folderPath).then(function (data) {
    //   if (!checkRequestError(data)) {
    //     _each
    //   }
    // }.bind(this), function (data){
    //   console.log("Erreur: " + data);
    // });
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
        }.bind(this));
      }
    }.bind(this), function (data){
      console.log("Erreur: " + data);
    });
  },

});

export default ConfirmExecutionDialog;
