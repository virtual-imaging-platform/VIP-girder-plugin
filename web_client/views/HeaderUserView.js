// Import utilities
import { wrap } from 'girder/utilities/PluginUtils';
import { getCurrentUser } from 'girder/auth';
import { AccessType } from 'girder/constants';

// Import views
import HeaderUserView from 'girder/views/layout/HeaderUserView';

// Import templates
import HeaderUserTemplate from '../templates/headerUser.pug';

// Add an entry to the HeaderUserView
wrap(HeaderUserView, 'render', function(render) {
  // Call the parent render
  render.call(this);

  var currentUser = getCurrentUser();

  // If the user is connected
  if (currentUser) {
    this.$('#g-user-action-menu>ul').prepend(HeaderUserTemplate({}));
  }

  return this;
});
