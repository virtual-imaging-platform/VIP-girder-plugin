// Import utilities
import router from 'girder/router';
import events from 'girder/events';

// Import Model
import FileModel from 'girder/models/FileModel';

// Import about Creatis
import ListPipelines from './views/ListPipelines';

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
