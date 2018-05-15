// Import utilities
import { getCurrentUser } from 'girder/auth';
import { restRequest, cancelRestRequests } from 'girder/rest';
import router from 'girder/router';
import events from 'girder/events';

// Import views
import FrontPageView from 'girder/views/body/FrontPageView';

function getCurrentApiKeyVip() {
  if (typeof getCurrentUser().get('apiKeyVip') === 'undefined' || getCurrentUser().get('apiKeyVip').length == 0) {
    cancelRestRequests('fetch');
    router.navigate('', {trigger: true});
    events.trigger('g:alert', {
      text: "You must have a VIP API key. For that, you have to go to https://vip.creatis.insa-lyon.fr and create an account. Now, you can fill in your key in 'My Account > VIP'",
      type: "danger",
      duration: 6000
    });
    return null;
  }

  return (getCurrentUser().get('apiKeyVip') ? getCurrentUser().get('apiKeyVip') : null);
}

export {
  getCurrentApiKeyVip
};
