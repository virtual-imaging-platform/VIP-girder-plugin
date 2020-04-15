//Import utilities
import _ from 'underscore';
import router from '@girder/core/router';
import { restRequest } from '@girder/core/rest';
import { cancelRestRequests } from '@girder/core/rest';
import { getCurrentUser } from '@girder/core/auth';
import events from '@girder/core/events';
import * as constants from '../constants';
import { hasTheVipApiKeyConfigured, sortPipelines, messageGirder, getCarminClient } from '../utilities/vipPluginUtils';

// Import Model
import FileCollection from '@girder/core/collections/FileCollection';

// Import views
import View from '@girder/core/views/View';
import ConfirmExecutionDialogMultiFiles from './ConfirmExecutionDialogMultiFiles';

// Import templates
import ListPipelinesMultiFilesTemplate from '../templates/listPipelinesMultiFiles.pug';

// List of pipelines allowed by the user
var ListPipelines = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    if (! hasTheVipApiKeyConfigured())
      // todo
      return ;

    if (typeof settings.itemsIds == 'undefined' || settings.itemsIds == null) {
      messageGirder('danger', 'Checked files not found to launch a VIP pipeline');
      router.navigate('/', {trigger: true});
      return ;
    }


    this.user = getCurrentUser();
    this.foldersCollection = [];

    var getPipelinesPromise = getCarminClient().listPipelines()
    .then(pipelines => this.pipelines = sortPipelines(pipelines))
    .catch( (status) => {
      messageGirder('danger', 'Error fetching VIP pipelines' + status);
      throw 'Error fetching VIP pipelines';
    });

    // Get checked files
    this.allFiles = new FileCollection();
    var fetchAllFilesPromise = this.fetchAllFiles(settings.itemsIds);


    Promise.all([getPipelinesPromise, fetchAllFilesPromise])
    .then( () => {
      if (this.allFiles.length) {
        this.render();
      } else {
        messageGirder('warning', 'The selected items do not have any file');
        router.navigate('/', {trigger: true});
      }
    })
    .catch( () => {
      messageGirder('danger', 'Error initializing VIP launch page');
      router.navigate('/', {trigger: true});
    });

    /*
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
    }.bind(this)); */

    // Get pipelines of user

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
      filesCount: this.allFiles.length
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

    getCarminClient().describePipeline(pipelineIdentifier).then(function (data) {
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

  fetchAllFiles: function (itemsIds) {
    var allDownloads = [];

    _.each(itemsIds, itemId => {
      var itemFiles = new FileCollection();
      itemFiles.altUrl = 'item/' + itemId + '/files';
      var downloadPromise = itemFiles.fetch()
      .then(() => {
        if (itemFiles.hasNextPage()) {
          messageGirder('danger', 'An item has too many files');
          throw 'An item has too many files';
        }
        this.allFiles.add(itemFiles.models);
        return undefined;
      });
      allDownloads.push(downloadPromise);
    });

    return Promise.all(allDownloads);
  }

});

export default ListPipelines;
