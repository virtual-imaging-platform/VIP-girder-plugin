// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { getCurrentUser } from '@girder/core/auth';

// Import views
import FrontPageView from '@girder/core/views/body/FrontPageView';

// Import templates
import FrontPageTemplate from '../templates/frontPage.pug';

// Add an entry to the HeaderUserView
wrap(FrontPageView, 'render', function(render) {
  // Call the parent render
  render.call(this);

  // Display the text in home page
  this.$('.g-frontpage-body').after(FrontPageTemplate({
    user: getCurrentUser()
  }));
  return this;
});
