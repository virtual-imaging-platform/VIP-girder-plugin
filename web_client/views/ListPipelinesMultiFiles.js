//Import utilities
import _ from 'underscore';
import router from '@girder/core/router';
import { restRequest } from '@girder/core/rest';
import { cancelRestRequests } from '@girder/core/rest';
import { confirm } from '@girder/core/dialog';
import { getCurrentUser } from '@girder/core/auth';
import events from '@girder/core/events';
import CarminClient from '../vendor/carmin/carmin-client';
import * as constants from '../constants';
import { getCurrentApiKeyVip, sortPipelines, messageGirder } from '../utilities';

// Import Model
import FileModel from '@girder/core/models/FileModel';

// Import views
import View from '@girder/core/views/View';
import ConfirmExecutionDialogMultiFiles from './ConfirmExecutionDialogMultiFiles';

// Import templates
import ListPipelinesMultiFilesTemplate from '../templates/listPipelinesMultiFiles.pug';

// List of pipelines allowed by the user
var ListPipelines = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    if (typeof settings.items == 'undefined' || settings.items == null) {
      messageGirder('danger', 'Checked files not found. Retry and don\'t reload the page', 3000);
      router.navigate('', {trigger: true});
      return ;
    }

    // Get checked files
    this.files = this.getFilesFromCheckedItems(settings.items);

    var apiKeyVip = getCurrentApiKeyVip();
    if (apiKeyVip == null)
      return ;

    this.user = getCurrentUser();
    this.foldersCollection = [];
    this.carmin = new CarminClient(constants.carminURL, apiKeyVip);

    if (!this.files) {
      messageGirder('danger', 'Checked files not found. Retry and don\'t reload the page', 3000);
      router.navigate('', {trigger: true});
      return ;
    }

    // Fill this.files with file's data
    _.each(this.files, function (file, i) {
      restRequest({
        method: 'GET',
        url: 'file/' + file._id + '/download',
        xhrFields: {
          responseType: "arraybuffer"
        }
      }).done((resp) => {
        this.files[i].data = new Uint8Array(resp);
      }).fail((error) => {
        console.log("Error:" + error);
      });
    }.bind(this));

    // Get pipelines of user
    this.carmin.listPipelines().then(function (data) {
      this.pipelines = sortPipelines(data);
      this.render();
    }.bind(this));

  },

  events: {
    'click .confirm-pipeline' : 'confirmPipeline'
  },

  render: function () {
    // Get folders of the collection
    //this.getFolderRecursively(this.collectionId, 0, "");

    // Get folders of the user
    this.getFolderRecursively(this.user.id, 0, "");

    this.$el.html(ListPipelinesMultiFilesTemplate({
      pipelines: this.pipelines,
      filesCount: Object.keys(this.files).length
    }));

    // User's view goes back up on top
    $("html, body").animate({scrollTop: 0}, "slow");

    return this;
  },

  /**
  * If the request to get details of pipeline has success
  * Create new instance of ConfirmPipelineDialog to
  * configure the launch of pipeline :
  *     - name of execution
  *     - result directory (stack results in girder)
  *     - checkbox to choose to send an email when the process is done
  *     - parameters of pipeline
  */
  confirmPipeline: function (e) {
    var pipelineIdentifier = $(e.currentTarget)[0].value;

    this.carmin.describePipeline(pipelineIdentifier).then(function (data) {
      if (typeof data.errorCode !== 'undefined') {
        events.trigger('g:alert', {
          text: "Unable to retrieve application informations for this version",
          type: "danger",
          duration: 3000
        });
      }
      else {
        new ConfirmExecutionDialogMultiFiles({
          files: this.files,
          filesCount: Object.keys(this.files).length,
          pipeline: data,
          foldersCollection: this.foldersCollection,
          carmin: this.carmin,
          parentView: this,
          el: $('#g-dialog-container')
        });
      }
    }.bind(this));

  },

  /**
  * Get all folders from the current collection OR from the current user
  * To get the folder tree of a collection
  *   - Replace 'user' to 'collection' line 118
  *   - Uncommented line 59
  *   - Commented line 62
  * Conversely, to get the folder tree of the user
  *   - Replace 'collection' to 'user' line 118
  *   - Uncommented line 62
  *   - Commented line 59
  */
  getFolderRecursively: function (parentId, i, path="") {
    var parentType = (i++ == 0) ? "user" : "folder";

    restRequest({
      method: "GET",
      url: "folder/",
      data: {
        parentType: parentType,
        parentId: parentId
      },
    }).done((resp) => {
      if (resp.length == 0)
      return;

      _.each(resp, function(e) {
        e.path = path.concat("/"+e.name);
        e.indent = i;
        e.indentText = "&nbsp;".repeat((i - 1) * 3);
        this.foldersCollection.push(e);
        this.getFolderRecursively(e._id, i, e.path);
      }.bind(this));
    });
  },

  getFilesFromCheckedItems: function (items) {
    var obj = {};
    var len = Object.keys(items).length - 1;

    _.each(items, function (item, i) {
      restRequest({
        method: 'GET',
        url: 'item/' + item.id + '/files',
        async: false,
        data: {
          limit: 1
        }
      }).done((resp) => {
        return restRequest({
          method: 'GET',
          url: 'file/' + resp[0]._id
        });
      }).done((resp) => {
        obj[i] = resp[0];
      });
    });

    return obj;
  }

});

export default ListPipelines;
