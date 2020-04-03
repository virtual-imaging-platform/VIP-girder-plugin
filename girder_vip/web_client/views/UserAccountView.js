// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { restRequest } from '@girder/core/rest'
import { getCurrentUser } from '@girder/core/auth';
import router from '@girder/core/router';
import events from '@girder/core/events';
import CarminClient from '../vendor/carmin/carmin-client';
import * as constants from '../constants';
import { getCurrentApiKeyVip } from '../utilities';

// Import views
import UserAccountView from '@girder/core/views/body/UserAccountView';

// Import templates
import UserAccountTab from '../templates/userAccountTab.pug';
import UserAccountVIP from '../templates/userAccountVIP.pug';

// Add an entry to the User Account view
wrap(UserAccountView, 'render', function(render) {
  render.call(this);

  // Get API key of VIP
  restRequest({
    method: 'GET',
    url: '/user/' + getCurrentUser().id + '/apiKeyVip'
  }).done((resp) => {

    // Display tab and pane
    $(this.el).find('ul.g-account-tabs.nav.nav-tabs').append(UserAccountTab);
    $(this.el).find('.tab-content').append(UserAccountVIP({apiKeyVip: resp}));

    // Change the route
    $(this.el).find('a[name="vip"]').on('shown.bs.tab', (e) => {
      var tab = $(e.currentTarget).attr('name');
      router.navigate('useraccount/' + this.model.id + '/' + tab);
    });

    // Event click on button (submit)
    $('#sendApiKeyVip').click(function (e) {
      e.preventDefault();

      var errorMessage = $(this.el).find('#creatis-vip-error-msg');
      var key = $(this.el).find('#creatis-apikey-vip').val();
      var carmin = new CarminClient(constants.CARMIN_URL, key);

      errorMessage.empty();

      // Test API key on VIP
      carmin.listPipelines().then((data) => {
        // Update User table
        restRequest({
          method: 'PUT',
          url: '/user/' + getCurrentUser().id + '/apiKeyVip',
          data: {
            apiKeyVip: key
          }
        }).done((resp) => {
          events.trigger('g:alert', {
            text: "API key of VIP has changed with success.",
            type: "success",
            duration: 3000
          });
          // Reload the page to get apiKeyVip with the function 'getCurrentUser'
          setTimeout(function() {
            document.location.reload(true);
          }, 1000);
        }).fail(() => {
          events.trigger('g:alert', {
            text: "An error occured while processing your request",
            type: "danger",
            duration: 3000
          });
        });
      }, (data) => {
        // Wrong API
        if (data == 401) {
          errorMessage.text("This API key is wrong");
          return ;
        }
      });

    }.bind(this));

  });
});
