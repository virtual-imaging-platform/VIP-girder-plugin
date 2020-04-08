// Import utilities
import router from '@girder/core/router';
import events from '@girder/core/events';
import { hasTheVipApiKeyConfigured, messageGirder } from './utilities/vipPluginUtils';

// Import Model
import FileModel from '@girder/core/models/FileModel';

// Import Views
import MyExecutions from './views/MyExecutions';
import ListPipelinesMultiFiles from './views/ListPipelinesMultiFiles';
import ItemView from '@girder/core/views/body/ItemView';

router.route('item/:id/file/:id/vip-pipelines', 'vip-pipelines', function (itemId, fileId, params) {
    ItemView.fetchAndInit(itemId, {
        showVipPipeline: true,
        vipPipelineFileId: fileId
    });
});

// New route #my-executions
router.route('my-executions', 'myexecutions', function() {
  if ( hasTheVipApiKeyConfigured()) {
   events.trigger('g:navigateTo', MyExecutions);
  } else {
   messageGirder("danger", "You must configure your VIP API key in \
       'My Account > VIP API key' to use VIP features"
     , 30000);
   router.navigate('', {trigger: true});
  }
})
