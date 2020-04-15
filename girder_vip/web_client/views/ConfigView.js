import PluginConfigBreadcrumbWidget from '@girder/core/views/widgets/PluginConfigBreadcrumbWidget';
import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';

import ConfigViewTemplate from '../templates/configView.pug';

var ConfigView = View.extend({
    events: {
    },


    initialize: function () {
        this.vipConfig;

        restRequest({
            method: 'GET',
            url: 'system/setting',
            data: {
                list: JSON.stringify(['vip_plugin.settings'])
            }
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
    }
}
