// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { restRequest } from '@girder/core/rest'
import { getCurrentUser } from '@girder/core/auth';
import {saveVipApiKey, messageGirder} from '../utilities';
import router from '@girder/core/router';
import events from '@girder/core/events';
import CarminClient from '../vendor/carmin/carmin-client';
import * as constants from '../constants';

// Import views
import UserAccountView from '@girder/core/views/body/UserAccountView';

// Import templates
import UserAccountTab from '../templates/userAccountTab.pug';
import UserAccountVIP from '../templates/userAccountVIP.pug';

// Add an entry to the User Account view
wrap(UserAccountView, 'render', function(render) {
  render.call(this);

  var apiKeyVip = getCurrentUser().get('apiKeyVip');
  if (typeof apiKeyVip === 'undefined') apiKeyVip = '';

  const TAB_NAME = "vip";
  // Display tab and pane
  $(this.el).find('ul.g-account-tabs.nav.nav-tabs').append(UserAccountTab);
  $(this.el).find('.tab-content').append(UserAccountVIP({apiKeyVip: apiKeyVip}));

  // Configure new vip tab
  var tablink = $(this.el).find('a[name=' + TAB_NAME + ']');
  // display the tab content on click
  tablink.on('shown.bs.tab', (e) => {
    this.tab = $(e.currentTarget).attr('name');
    router.navigate('useraccount/' + this.model.id + '/' + this.tab);
  });
  // display the tab if requested from url
  if (TAB_NAME === this.tab) {
    tablink.tab("show");
  }
});

UserAccountView.prototype.events['submit #ApiKeyVip-form'] = function (e) {
  e.preventDefault();

  var errorMessage = this.$('#creatis-vip-error-msg');
  var newkey = this.$('#creatis-apikey-vip').val();
  var carmin = new CarminClient(constants.CARMIN_URL, newkey);

  errorMessage.empty();

  if (newkey.length === 0) {
    saveVipApiKey(newkey).then(() = > this.render());
  } else {
    // Test API key on VIP
    carmin.listPipelines()
      // Update User table
    .then(pipelines => saveVipApiKey(newkey))
    .then(() = > this.render())
    .catch(status => {
      // Wrong API
      if (status === 401) {
        errorMessage.text("This API key is wrong");
        return ;
      } else {
        messageGirder("danger", "An error occured while changing VIP API key, please concact administrators");
      }
    });
  }
};
