import _ from 'underscore';
import events from '@girder/core/events';
import { restRequest } from '@girder/core/rest';
import { messageGirder} from '../utilities/vipPluginUtils';

import PluginConfigBreadcrumbWidget from '@girder/core/views/widgets/PluginConfigBreadcrumbWidget';
import View from '@girder/core/views/View';

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
            this.vipConfig = resp;
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

    onSubmit: function(e) {
      e.preventDefault();

      if (! this.buildAndValidate()) return;

      // its ok, save on girder server

      restRequest({
          method: 'PUT',
          url: 'system/setting',
          data: {
            key: 'vip_plugin.settings',
            value: JSON.stringify(this.vipConfig)
          },
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

      if (vipUrlString  && this.isUrlValid(vipUrlString)) {
        this.vipConfig.vip_url = vipUrlString;
      } else {
        isValid = false;
        messageGirder("danger", "Wrong vip url");
      }

      if (storageName  && /^\w+$/.test(storageName)) {
        this.vipConfig.vip_external_storage_name = storageName
      } else {
        isValid = false;
        messageGirder("danger", "Wrong girder external storage");
      }

      return this.buildAndValidateCollections(collections) && isValid;
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
      if (collectionsString.length === 0) {
        this.vipConfig.authorized_collections = [];
        return true;
      }

      var collections = collectionsString.split(/\s*[,;:]\s*/);

      if(_.every(collections, e => /^\w+$/.test(e))) {
        this.vipConfig.authorized_collections = collections;
        return true;
      }

      messageGirder("danger", "Wrong collection list format");
      return false;
    }
});



export default ConfigView;
