//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import router from '@girder/core/router';
import { cancelRestRequests } from '@girder/core/rest';
import { getCurrentUser } from '@girder/core/auth';
import * as constants from '../constants';
import { hasTheVipApiKeyConfigured, sortPipelines, messageGirder, getCarminClient, verifyApiKeysConfiguration } from '../utilities/vipPluginUtils';

// Import views
import View from '@girder/core/views/View';
import ConfirmExecutionDialog from './ConfirmExecutionDialog';
import LoadingAnimation from '@girder/core/views/widgets/LoadingAnimation';
import '@girder/core/utilities/jquery/girderModal';

// Import templates
import ListPipelinesTemplate from '../templates/listPipelines.pug';


// List of pipelines allowed by the user
var ListPipelinesWidget = View.extend({

  events: {
    'click button.confirm-pipeline' : 'confirmPipeline'
  },

  initialize: function (settings) {
    cancelRestRequests('fetch');

    // Get api key of VIP
    if (! hasTheVipApiKeyConfigured()) {
      messageGirder('danger', 'You should have a VIP key configured to launch a VIP pipeline');
      this.$el.modal('hide');
      return ;
    }
    if (! settings.file || ! settings.item) {
      messageGirder('danger', 'Missing information to launch a VIP pipeline');
      this.$el.modal('hide');
      return ;
    }

    this.user = getCurrentUser();
    this.file = settings.file;
    this.item = settings.item;
    this.goingToConfirmDialog = false;
    this.originalRoute = Backbone.history.fragment;

    this.foldersCollection = [];


    this.render();
    new LoadingAnimation({
        el: this.$('.modal-body'),
        parentView: this
    }).render();

    verifyApiKeysConfiguration({printWarning : true})
    .then(isOk => {
      if (isOk) {
        // Get pipelines of user
        // they are sorted by name with custom ids as keys
        return getCarminClient().listPipelines().then(pipelines => {
          this.pipelines = sortPipelines(pipelines);
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


    this.getFolderRecursively(this.user.id, 0, ""); // todo : to move

  },

  render: function () {

    this.$el.html(ListPipelinesTemplate({
      file: this.file,
      pipelines: this.pipelines,
    }));

    this.$el.girderModal(this).on('hidden.bs.modal', () => {
      if (! this.goingToConfirmDialog) {
        // reset route to the former one
        this.goToParentRoute();
      }
    });

    return this;
  },

  goToParentRoute: function () {

    var currentRoute = Backbone.history.fragment;
    if (currentRoute !== this.originalRoute) {
      // the route has already changed (back or loading custom url)
      return;
    }
    // default for folder view, remove starting from item path
    var stopIndex = currentRoute.indexOf('/item/');
    // but if it start by 'item', its an item view, remove starting from file path
    if (currentRoute.startsWith('item'))
      var stopIndex = currentRoute.indexOf('/file/');

    router.navigate(currentRoute.substring(0, stopIndex), {replace: true});
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

    getCarminClient().describePipeline(pipelineVersion.identifier)
    .then(pipeline => {
      this.goingToConfirmDialog = true;
      new ConfirmExecutionDialog({
        file: this.file,
        pipeline: pipeline,
        foldersCollection: this.foldersCollection,
        vipConfigOk : true,
        parentView: this.parentView,
        el: $('#g-dialog-container')
      });
    })
    .catch(error => {
      messageGirder("danger", "Unable to retrieve application informations :" + error);
      this.render();
    });
  }

});

export default ListPipelinesWidget;
