//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import { cancelRestRequests } from '@girder/core/rest';
import { confirm } from '@girder/core/dialog';
import { getCurrentUser } from '@girder/core/auth';
import events from '@girder/core/events';
import CarminClient from '../vendor/carmin/carmin-client';
import * as constants from '../constants';
import { getCurrentApiKeyVip, sortPipelines } from '../utilities/vipPluginUtils';

// Import views
import View from '@girder/core/views/View';
import ConfirmExecutionDialog from './ConfirmExecutionDialog';

// Import templates
import ListPipelinesTemplate from '../templates/listPipelines.pug';

// List of pipelines allowed by the user
var ListPipelinesWidget = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    // Get api key of VIP
    var apiKeyVip = getCurrentApiKeyVip();
    if (apiKeyVip == null) {
    //  TODO close modal
      return ;
    }
    if (! settings.file ||_! settings.item) {
      messageGirder('danger', 'Missing information to launch a VIP pipeline');
      //  TODO close modal
      return ;
    }

    this.user = getCurrentUser();
    this.file = settings.file;
    this.item = settings.item;

    this.foldersCollection = [];
    this.carmin = new CarminClient(constants.CARMIN_URL, apiKeyVip);
    new LoadingAnimation({
        el: this.$el,
        parentView: this
    }).render();

    // Get pipelines of user
    this.carmin.listPipelines().then(pipelines => {
      this.pipelines = sortPipelines(pipelines);
      this.render();
    });

  },

  events: {
    'click .confirm-pipeline' : 'confirmPipeline'
  },

  render: function () {
    // Get folders of the collection
    //this.getFolderRecursively(this.collectionId, 0, "");

    // Get folders of the user
    this.getFolderRecursively(this.user.id, 0, "");

    this.$el.html(ListPipelinesTemplate({
      file: this.file,
      pipelines: this.pipelines,
    }));

    // User's view goes back up on top
    // $("html, body").animate({scrollTop: 0}, "slow");

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
        new ConfirmExecutionDialog({
          file: this.file,
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
  * Conversely, to get the folder tree of the user (default)
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
      if (resp.length == 0) {
        return;
      }

      _.each(resp, function(e) {
        e.path = path.concat("/"+e.name);
        e.indent = i;
        e.indentText = "&nbsp;".repeat((i - 1) * 3);
        this.foldersCollection.push(e);
        this.getFolderRecursively(e._id, i, e.path);
      }.bind(this));
    });
  }

});

export default ListPipelinesWidget;
