// Import utilities
import router from '@girder/core/router';
import events from '@girder/core/events';

import { exposePluginConfig } from '@girder/core/utilities/PluginUtils';

exposePluginConfig('vip', 'plugins/vip/config');

import ConfigView from './views/ConfigView';
router.route('plugins/vip/config', 'vipConfig', function () {
    events.trigger('g:navigateTo', ConfigView);
});

// New route #my-executions
import MyExecutions from './views/MyExecutions';
router.route('my-executions', 'myexecutions', function() {
   events.trigger('g:navigateTo', MyExecutions);
})

// New route #launch-vip-pipeline
import LaunchVipPipeline from './views/LaunchVipPipeline';
router.route('vip-pipeline/:id/:id', 'launch-vip-pipeline', function(application, version) {
   LaunchVipPipeline.fetchAndInit(application, version);
})
