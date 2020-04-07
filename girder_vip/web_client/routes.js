// Import utilities
import router from '@girder/core/router';
import events from '@girder/core/events';
import { hasTheVipApiKeyConfigured, messageGirder } from './utilities/vipPluginUtils';

// Import Model
import FileModel from '@girder/core/models/FileModel';

// Import Views
import ListPipelines from './views/ListPipelines';
import MyExecutions from './views/MyExecutions';
import ListPipelinesMultiFiles from './views/ListPipelinesMultiFiles';

// New route #pipelines
router.route('file/:id/#pipelines', 'filePipelines', function(id) {
  // Fetch the item by id, then render the view
  var file = new FileModel({
    _id: id
  }).once('g:fetched', function() {
    events.trigger('g:navigateTo', ListPipelines, {
      file: file
    });
  }).once('g:error', function() {
    router.navigate('collections', {trigger: true});
  }).fetch();
});

// New route #pipelines
router.route('pipelines-multi-files', 'pipelinesMultiFiles', function(params) {
  events.trigger('g:navigateTo', ListPipelinesMultiFiles);
})

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
