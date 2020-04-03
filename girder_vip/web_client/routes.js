// Import utilities
import router from '@girder/core/router';
import events from '@girder/core/events';

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
  events.trigger('g:navigateTo', MyExecutions);
})
