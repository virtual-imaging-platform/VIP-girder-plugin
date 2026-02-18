// Import utilities
import _ from 'underscore';
import events from '@girder/core/events';
import router from '@girder/core/router';
import { cancelRestRequests } from '@girder/core/rest';
import { hasTheVipApiKeyConfigured, sortPipelines, messageGirder, doVipRequest, verifyApiKeysConfiguration } from '../utilities/vipPluginUtils';

// Import collections
import FavoritePipelineCollection from "../collections/FavoritePipelineCollection";

// Import views
import View from '@girder/core/views/View';
import LaunchVipPipeline from './LaunchVipPipeline';
import LoadingAnimation from '@girder/core/views/widgets/LoadingAnimation';
import '@girder/core/utilities/jquery/girderModal';

// Import templates
import ListPipelinesTemplate from '../templates/listPipelines.pug';

// List of pipelines allowed by the user
var ListPipelinesWidget = View.extend({

  events: {
    'click button.confirm-pipeline' : 'confirmPipeline',
    'click .toggle-favorite' : 'toggleFavorite',
    'mouseenter .toggle-favorite': 'onStarHover',
    'mouseleave .toggle-favorite': 'onStarLeave',
    'change .show-only-favorites-checkbox': 'onShowOnlyFavToggle'
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
        this.pipelinesFavCollection = new FavoritePipelineCollection();
        // Get pipelines of user
        // they are sorted by name with custom ids as keys
        this.fetchPipelines();
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
    Promise.all([
      doVipRequest('listPipelines'),
      this.pipelinesFavCollection.fetch()
    ]).then(([pipelines]) => {
      this.pipelines = sortPipelines(pipelines);
      this.render();
      _.each(this.pipelinesFavCollection.models, favorite => {
        const pipelineName = favorite.get('pipelineName');
        // Check and delete rogue pipelines, removed on VIP but still in Girder db
        if (!_.some(pipelines, {name: pipelineName})) {
          favorite.destroy();
          return;
        }
        // Update favorites icons
        const favBtn = this.$('.toggle-favorite[name="' + pipelineName + '"]');
        favBtn.removeClass('icon-star-empty').addClass('icon-star').addClass('text-warning');
      });
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
    // Check and update only favorites checkbox state from persistent storage
    const showOnlyFavorites = window.localStorage.getItem('showOnlyFavorites') === 'true';
    this.$('.show-only-favorites-checkbox').prop('checked', showOnlyFavorites);
    if (this.pipelinesFavCollection && showOnlyFavorites) {
      this.onShowOnlyFavToggle({currentTarget: this.$('.show-only-favorites-checkbox')});
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
      this.destroy();
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
  },

  toggleFavorite: function(e) {
    e.stopPropagation();
    e.preventDefault();

    const favBtn = $(e.currentTarget);
    const pipelineName = favBtn.attr("name");
    const favorite = _.find(this.pipelinesFavCollection.models, obj => obj.get('pipelineName') === pipelineName);
    // Delete model from favorite collection if it exists
    if (favorite) {
      favorite.destroy()
          .then(() => {
            favBtn.removeClass('icon-star').addClass('icon-star-empty');
            // If showing only favorites, hide the row
            const showOnlyFavorites = this.$('.show-only-favorites-checkbox').is(':checked');
            if (showOnlyFavorites) {
              this.$('.pipeline-row[name="'+ pipelineName + '"]').hide();
            }
        });
    } else {
      this.pipelinesFavCollection.addFavoritePipeline(pipelineName)
          .then(() => {
            favBtn.removeClass('icon-star-empty').addClass('icon-star');
          });
    }
  },

  onShowOnlyFavToggle: function(e) {
    const showOnlyFavorites = $(e.currentTarget).is(':checked');
    // Update persistent storage
    window.localStorage.setItem('showOnlyFavorites', showOnlyFavorites);
    // Hide non-favorites and show favorites pipelines
    if (showOnlyFavorites) {
      this.$('tr.pipeline-row').hide();
      _.each(this.pipelinesFavCollection.models, fav => {
        this.$('tr.pipeline-row[name="' + fav.get('pipelineName') + '"]').show();
      });
    } else {
      this.$('tr.pipeline-row').show();
    }
  },

  onStarHover: function(e) {
    const favBtn = $(e.currentTarget);
    favBtn.addClass('text-warning').css('transform', 'scale(1.2)');
  },

  onStarLeave: function(e) {
    const favBtn = $(e.currentTarget)
    const isFav = favBtn.hasClass('icon-star');
    favBtn.css('transform', '');
    if (!isFav) {
      favBtn.removeClass('text-warning')
    }
  }
});

export default ListPipelinesWidget;
