// Import utilities
import router from 'girder/router';
import events from 'girder/events';

// Import Model
import FileModel from 'girder/models/FileModel';

// Import Views
import ListPipelines from './views/ListPipelines';
import MyPipelines from './views/MyPipelines';
import ListPipelinesMultiFiles from './views/ListPipelinesMultiFiles';
import Hello from './views/Hello';

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

// New route #my-pipelines
router.route('my-pipelines', 'myPipelines', function() {
  events.trigger('g:navigateTo', MyPipelines);
})

// Tuto
router.route('hello', 'hello', function() {
  events.trigger('g:navigateTo', Hello);
})
