// Import utilities
const router = girder.router;
const events = girder.events;

const { exposePluginConfig } = girder.utilities.PluginUtils;

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
