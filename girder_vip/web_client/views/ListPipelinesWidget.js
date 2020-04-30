//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import { handleOpen } from '@girder/core/dialog';
import { parseQueryString, splitRoute } from '@girder/core/misc';
import router from '@girder/core/router';
import { cancelRestRequests } from '@girder/core/rest';
import * as constants from '../constants';
import { hasTheVipApiKeyConfigured, sortPipelines, messageGirder, doVipRequest, verifyApiKeysConfiguration } from '../utilities/vipPluginUtils';

// Import views
import View from '@girder/core/views/View';
import VipModal from './VipPluginModal';
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

    this.file = settings.file || false;

    this.render();
    new LoadingAnimation({
        el: this.$('.modal-body'),
        parentView: this
    }).render();

    // verify user is connected and has a vip key configured
    if (! hasTheVipApiKeyConfigured()) {
      messageGirder('danger', 'You should have a VIP key configured to launch a VIP pipeline');
      this.$el.modal('hide');
      return ;
    }

    verifyApiKeysConfiguration({printWarning : true})
    .then(isOk => {
      if (isOk) {
        // Get pipelines of user
        // they are sorted by name with custom ids as keys
        return this.fetchPipelines().then(() => this.render());
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

  fetchPipelines: function() {
    return doVipRequest('listPipelines').then(pipelines => {
      this.pipelines = sortPipelines(pipelines);
    });
  },

  render: function () {

    this.$el.html(ListPipelinesTemplate({
      file: this.file,
      pipelines: this.pipelines,
    }));

    // render once with loading anim, then with data
    if ( ! this.alreadyRendered) {
      this.$el.girderModal(this);
      this.alreadyRendered = true;
    }

    return this;
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

    doVipRequest('describePipeline', pipelineVersion.identifier)
    .then(pipeline => {
      this.goingToConfirmDialog = true;
      new ConfirmExecutionDialog({
        file: this.file,
        pipeline: pipeline,
        pipelines: this.pipelines,
        vipConfigOk : true,
        parentView: this.parentView,
        el: $('#g-dialog-container')
      });
    })
    .catch(error => {
      messageGirder("danger", "Unable to retrieve VIP application informations : " + error);
    });
  }

});

export default ListPipelinesWidget;
