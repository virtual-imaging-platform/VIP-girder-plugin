// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { getCurrentUser } from '@girder/core/auth';
import {saveVipApiKey, messageGirder, updateApiKeysConfiguration, verifyApiKeysConfiguration} from '../utilities/vipPluginUtils';
import router from '@girder/core/router';
import events from '@girder/core/events';
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
  if (! apiKeyVip) apiKeyVip = '';

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

    if (! this.vipPluginConfigChecked) {
      this.vipPluginConfigChecked = true;
      this.checkVipPluginConfig( ! this.showOnStart);
    }
  });
  // display the tab if requested from url
  if (TAB_NAME === this.tab) {
    this.showOnStart = true;
    tablink.tab("show");
  }
});

UserAccountView.prototype.checkVipPluginConfig = function (useInternalCollection) {

  if (! this.$('#creatis-apikey-vip').val()) return;

  // Test and correct everything
  verifyApiKeysConfiguration({
    printWarning : false,
    keysCollection : useInternalCollection ? this.apiKeyListWidget.collection : false
  })
  .then(isOk => {
    if (isOk) return;
    messageGirder("warning", "There is a problem with your VIP configuration. Please click \"Update\"");
  })
  .catch(error => {
    messageGirder("warning", "There is a with the VIP plugin configuration : " + error);
  });

};

UserAccountView.prototype.events['submit #ApiKeyVip-form'] = function (e) {
  e.preventDefault();

  var newkey = this.$('#creatis-apikey-vip').val();

  if (newkey.length === 0) {
    saveVipApiKey(newkey).then(() => this.render());
    return;
  }
  // Test and correct everything
  updateApiKeysConfiguration({
    newKey : newkey,
    printWarning : false,
    keysCollection : this.apiKeyListWidget.collection
  })
  .then(() => saveVipApiKey(newkey))
  .then(() => {
    this.render()
    // reload header view to refresh the 'My execution' menu
    events.trigger('vip:vipApiKeyChanged', {apiKeyVip: newkey});
    messageGirder("success", "Your VIP configuration has been updated");
  })
  .catch(error => {
    messageGirder("danger", "An error occured while changing VIP API key : " + error );
  });
};
