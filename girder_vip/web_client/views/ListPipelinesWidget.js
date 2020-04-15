//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import { handleOpen } from '@girder/core/dialog';
import { parseQueryString, splitRoute } from '@girder/core/misc';
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

    this.user = getCurrentUser();
    this.file = settings.file;
    this.item = settings.item;
    this.pipelines = settings.pipelines;

    this.initRoute();

    this.render();
    new LoadingAnimation({
        el: this.$('.modal-body'),
        parentView: this
    }).render();

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

    verifyApiKeysConfiguration({printWarning : true})
    .then(isOk => {
      if (isOk) {
        // Get pipelines of user
        // they are sorted by name with custom ids as keys
        return this.fetchPipelinesIfNecessary()
        .then(() => this.render());
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

  fetchPipelinesIfNecessary: function() {
    if (this.pipelines) return Promise.resolve();

    return getCarminClient().listPipelines().then(pipelines => {
      this.pipelines = sortPipelines(pipelines);
    });
  }

  render: function () {

    this.$el.html(ListPipelinesTemplate({
      file: this.file,
      pipelines: this.pipelines,
    }));

    if (this.alreadyRendered) return this;

    this.alreadyRendered = true;
    this.$el.girderModal(this).on('hidden.bs.modal', () => {
      if (! this.goingToConfirmDialog) {
        // reset route to the former one
        this.goToParentRoute();
      }
    });

    return this;
  },

  initRoute: function() {
    this.route = Backbone.history.fragment
    var queryParams = parseQueryString(splitRoute(this.route).name);
    if (queryParams.dialog && queryParams.dialog == 'vip-pipelines') {
      // route already OK
      return;
    }
    var routeToAdd = '/file/' + this.file.id;
    if ( ! this.route.indexOf('item/')) {
      routeToAdd = '/item/' + this.item.id + '/' + route;
    }
    router.navigate(this.route + routeToAdd);
    handleOpen('vip-pipelines', {replace : true});
    this.route = Backbone.history.fragment;

  },

  goToParentRoute: function () {
    var currentRoute = Backbone.history.fragment;
    if (currentRoute === this.route) {
      // if the route has not already changed (back or loading custom url)
      router.navigate(this.parentView.getRoute(), {replace: true});
    }
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
        item: this.item,
        pipeline: pipeline,
        pipelines: this.pipelines,
        vipConfigOk : true,
        parentView: this.parentView,
        el: $('#g-dialog-container')
      });
    })
    .catch(error => {
      messageGirder("danger", "Unable to retrieve application informations : " + error);
    });
  }

});

export default ListPipelinesWidget;
