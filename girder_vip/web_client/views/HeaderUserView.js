// Import utilities
const { wrap } = girder.utilities.PluginUtils;
import { hasTheVipApiKeyConfigured } from '../utilities/vipPluginUtils';
const events = girder.events;

// Import views
const HeaderUserView = girder.views.layout.HeaderUserView;
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
