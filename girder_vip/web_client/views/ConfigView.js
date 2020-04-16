import _ from 'underscore';
import PluginConfigBreadcrumbWidget from '@girder/core/views/widgets/PluginConfigBreadcrumbWidget';
import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';
import { messageGirder} from '../utilities/vipPluginUtils';

import ConfigViewTemplate from '../templates/configView.pug';

var ConfigView = View.extend({
    events: {
      'submit #vip-plugin-config-form' : 'onSubmit'
    },

    initialize: function () {
        this.vipConfig;

        restRequest({
            method: 'GET',
            url: 'system/setting',
            data: {key: 'vip_plugin.settings'}
        }).done((resp) => {
            this.vipConfig = resp['vip_plugin.settings'] || [];
            this.render();
        });
    },

    render: function () {
        this.$el.html(ConfigViewTemplate({
            vipConfig: this.vipConfig,
            authorized_collections_string : this.vipConfig.authorized_collections.join(' ; ')
        }));

        new PluginConfigBreadcrumbWidget({
            pluginName: 'VIP',
            el: this.$('.g-config-breadcrumb-container'),
            parentView: this
        }).render();

        return this;
    },

    onSubmit: function() {
      e.preventDefault();

      if (! this.buildAndValidate()) return;

      // its ok, save on girder server

      restRequest({
          method: 'PUT',
          url: 'system/setting',
          data: {
            key: 'vip_plugin.settings',
            value: this.vipConfig
          }
          error: null
      }).done(() => {
          events.trigger('g:alert', {
              icon: 'ok',
              text: 'Settings saved.',
              type: 'success',
              timeout: 4000
          });
      }).fail((resp) => {
        messageGirder("danger", "Girder error : " + resp.responseJSON.message);
      });

    },

    buildAndValidate: function() {
      var vipUrlString = this.$('#vip-config-url').val().trim();
      var storageName = this.$('#vip-config-storage-name').val().trim();
      var collections = this.$('#vip-config-collections').val().trim();

      var isValid = true;

      if (! vipUrlString  || ! this.isUrlValid(vipUrlString)) {
          isValid = false;
          messageGirder("danger", "Wrong vip url");
      } else {
        this.vipConfig.vip_url = vipUrlString;
      }

      if (! storageName  || /^\w+#/.test(storageName)) {
          isValid = false;
          messageGirder("danger", "Wrong girder external storage");
      } else {
        this.vipConfig.vip_external_storage_name = storageName
      }

      return isValid && this.buildAndValidateCollections();
    },

    isUrlValid: function(urlString) {
      var url;
      try {
        url = new URL(urlString);
      } catch (_) {
        return false;
      }

      return url.protocol === "http:" || url.protocol === "https:";
    },

    buildAndValidateCollections: function(collectionsString) {
      var collections = collectionsString.split(/\s*[,;:]]\s*/);

      if(_.every(collections, e => /^\w+#/.test(e))) {
        this.vipConfig.authorized_collections = collections;
        return true;
      }

      messageGirder("danger", "Wrong collection list format");
      return false;
    }
});



export default ConfigView;
