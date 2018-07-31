// Import utilities
import { wrap } from 'girder/utilities/PluginUtils';
import { getCurrentUser } from 'girder/auth';

// Import views
import FrontPageView from 'girder/views/body/FrontPageView';

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
