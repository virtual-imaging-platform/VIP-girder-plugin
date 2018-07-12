// Import utilities
import { wrap } from 'girder/utilities/PluginUtils';
import { animatedModal } from '../vendor/js/animatedModal.min'

// Import views
import LayoutGlobalNav from 'girder/views/layout/GlobalNavView';

// Import templates
import LayoutGlobalNavTemplate from '../templates/globalNav.pug';

// Add new element to navbar (menu)
wrap(LayoutGlobalNav, 'render', function(render) {
  render.call(this);
  this.$(".g-global-nav").append(LayoutGlobalNavTemplate());
  //console.log(animatedModal());
  $('#nav-help').animatedModal();
  return this;
});
