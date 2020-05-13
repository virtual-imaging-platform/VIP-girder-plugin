//Import utilities
import _ from 'underscore';
import events from '@girder/core/events';
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
import LaunchVipPipeline from './LaunchVipPipeline';
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
    this.item = settings.item || false;

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
        messageGirder('danger', 'Configuration error, you cannot launch a VIP \
          execution. Please check your VIP API key configuration in your \
          girder account');
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
      this.navigateIfPossible(pipeline);
      this.$el.modal('hide');
      events.trigger('g:navigateTo', LaunchVipPipeline, {
        file: this.file,
        item: this.item,
        pipeline: pipeline,
        vipConfigOk : true
      });
    })
    .catch(error => {
      messageGirder("danger", "Unable to retrieve VIP application informations : " + error);
    });
  },

  navigateIfPossible: function(pipeline) {
    // there is a bug in backbone routing, all reserved uri characters (space,
    // slash etc) cause a page refresh that break things
    // so we replace space by '+' that are well handled by backbone and vip
    var encodedIdendifier = _.chain(pipeline.identifier.split('/'))
    .map(part => part.split(' '))
    .map(partSplitted => _.map(partSplitted, p => encodeURIComponent(p))) // encode other characters
    .map(partSplitted => partSplitted.join('+'))
    .join('/')
    .value();

    // test if backbone will detect a change
    if (encodedIdendifier === decodeURI(encodedIdendifier)) {
      // its ok : change router
      router.navigate('/vip-pipeline/' + encodedIdendifier);
    }
    // do not change route otherwise, i've not solution but this should only
    // happen if there are strange characters in pipeline identifier
    // (and its not important if the route does not change, it just prevent
    // from using F5)
  }

});

export default ListPipelinesWidget;
