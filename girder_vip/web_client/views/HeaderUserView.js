// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { hasTheVipApiKeyConfigured } from '../utilities/vipPluginUtils';
import events from '@girder/core/events';

// Import views
import HeaderUserView from '@girder/core/views/layout/HeaderUserView';
import ListPipelinesWidget from './ListPipelinesWidget';

// Import templates
import HeaderUserTemplate from '../templates/headerUser.pug';

// Add an entry to the HeaderUserView
wrap(HeaderUserView, 'render', function(render) {
  // Call the parent render
  render.call(this);

  if ( hasTheVipApiKeyConfigured()) {
    this.$('#g-user-action-menu li>a.g-logout').parent()
      .before(HeaderUserTemplate());
  }

  return this;
});

wrap(HeaderUserView, 'initialize', function(initialize, args) {
  // Call the parent render
  initialize.call(this, args);

  this.listenTo(events, 'vip:vipApiKeyChanged', this.render);
});

HeaderUserView.prototype.events['click a.launch-pipeline'] = function (e) {
  // todo : verify vip config
  new ListPipelinesWidget({
      el: $('#g-dialog-container'),
      parentView: this
  });
};
