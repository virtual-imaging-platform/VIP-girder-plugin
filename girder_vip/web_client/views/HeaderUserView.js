// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { getCurrentUser } from '@girder/core/auth';
import { AccessType } from '@girder/core/constants';
import { hasTheVipApiKeyConfigured } from '../utilities';

// Import views
import HeaderUserView from '@girder/core/views/layout/HeaderUserView';

// Import templates
import HeaderUserTemplate from '../templates/headerUser.pug';

// Add an entry to the HeaderUserView
wrap(HeaderUserView, 'render', function(render) {
  // Call the parent render
  render.call(this);

  if ( ! hasTheVipApiKeyConfigured) {
    return;
  }

  var currentUser = getCurrentUser();

  // If the user is connected
  if (currentUser) {
    this.$('#g-user-action-menu>ul').prepend(HeaderUserTemplate({}));
  }

  return this;
});
