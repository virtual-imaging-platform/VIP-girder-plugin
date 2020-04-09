//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import router from '@girder/core/router';
import { cancelRestRequests } from '@girder/core/rest';
import { confirm } from '@girder/core/dialog';
import { getCurrentUser } from '@girder/core/auth';
import events from '@girder/core/events';
import CarminClient from '../vendor/carmin/carmin-client';
import LoadingAnimation from '@girder/core/views/widgets/LoadingAnimation';
import * as constants from '../constants';
import { getCurrentApiKeyVip, sortPipelines, messageGirder } from '../utilities/vipPluginUtils';

// Import views
import View from '@girder/core/views/View';
import ConfirmExecutionDialog from './ConfirmExecutionDialog';

// Import templates
import ListPipelinesTemplate from '../templates/listPipelines.pug';

import '@girder/core/utilities/jquery/girderModal';

// List of pipelines allowed by the user
var ListPipelinesWidget = View.extend({

  events: {
    'click button.confirm-pipeline' : 'confirmPipeline'
  },

  initialize: function (settings) {
    cancelRestRequests('fetch');

    // Get api key of VIP
    var apiKeyVip = getCurrentApiKeyVip();
    if (apiKeyVip == null) {
    //  TODO close modal
      return ;
    }
    if (! settings.file || ! settings.item) {
      messageGirder('danger', 'Missing information to launch a VIP pipeline');
      //  TODO close modal
      return ;
    }

    this.user = getCurrentUser();
    this.file = settings.file;
    this.item = settings.item;
    this.goingToConfirmDialog = false;

    this.foldersCollection = [];
    this.carmin = new CarminClient(constants.CARMIN_URL, apiKeyVip);

    // Get pipelines of user
    // they are sorted by name with custom ids as keys
    this.carmin.listPipelines().then(pipelines => {
      this.pipelines = sortPipelines(pipelines);
      this.render();
    });


    this.getFolderRecursively(this.user.id, 0, "");

  },

  render: function () {

    this.$el.html(ListPipelinesTemplate({
      file: this.file,
      pipelines: this.pipelines,
    }));

    this.$el.girderModal(this).on('hidden.bs.modal', () => {
      if (! this.goingToConfirmDialog) {
        // reset route to the former one
        router.navigate(this.getParentRoute(), {replace: true});
      }
    });

    return this;
  },

  getParentRoute: function () {

    var currentRoute = Backbone.history.fragment;
    // default for folder view, remove starting from item path
    var stopIndex = currentRoute.indexOf('/item/');
    // but if it start by 'item', its an item view, remove starting from file path
    if (currentRoute.startWith('item'))
      var stopIndex = currentRoute.indexOf('/file/');

    return currentRoute.substring(0, stopIndex);
  },

  confirmPipeline: function (e) {
    var pipelineId = $(e.currentTarget).attr("pid");
    var pipelineVersionId =
      this.$('select.select-version-pipeline[pid='+ pipelineId + ']').val();

    var pipelineVersion =  _.findWhere(
        this.pipelines[pipelineId],
        {versionId : pipelineVersionId});

    new LoadingAnimation({
        el: this.$('.modal-body'),
        parentView: this
    }).render();

    this.carmin.describePipeline(pipelineVersion.identifier)
    .then(pipeline => {
      this.goingToConfirmDialog = true;
      new ConfirmExecutionDialog({
        file: this.file,
        pipeline: pipeline,
        foldersCollection: this.foldersCollection,
        carmin: this.carmin,
        parentView: this.parentView,
        el: $('#g-dialog-container')
      });
    })
    .catch(error => {
      messageGirder("danger", "Unable to retrieve application informations :" + error);
      this.render();
    });
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
