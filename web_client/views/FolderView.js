// Import utilities
import _ from 'underscore';
import { wrap } from 'girder/utilities/PluginUtils';
import events from 'girder/events';
import { restRequest } from 'girder/rest'

// Import views
import ItemListWidget from 'girder/views/widgets/ItemListWidget';

// Import about Creatis
import ButtonListPipeline from '../templates/buttonListPipeline.pug';
import SelectImage from '../templates/selectImage.pug';
import CollapseImage from '../templates/collapseImage.pug'

import '../stylesheets/collapseImage.styl';

import PipelineModel from '../models/PipelineModel';

// Add an entry to the FolderView
wrap(ItemListWidget, 'render', function(render) {
    render.call(this);

    // Test pipeline server
    new PipelineModel({
	title: "coucou"
    }).on('g:saved').save();

    // For each entry of item
    var selector = 'li.g-item-list-entry';
    _.each(this.$(selector), function (el) {
	var itemCid = $(el).find('.g-list-checkbox').attr('g-item-cid');
	var itemId = this.collection.get(itemCid).id;
	var nbFiles = 0;

	// Write itemCid on parent element
	$(el).attr('g-item-cid', itemCid);

	// Get number of files within item
	restRequest({
	    method: 'GET',
	    url: '/item/' + itemId + '/files'
	}).done((resp) => {
	    if (_.size(resp) == 1) {
		$(el).find('.g-view-inline').after(ButtonListPipeline({fileId: resp[0]._id}));
	    } else {
		$(el).find('.g-view-inline').after(CollapseImage({files: resp}));
	    }
	}).fail((resp) => {
	    console.log('restRequest: get files from item failed');
	});

    }, this);
});
