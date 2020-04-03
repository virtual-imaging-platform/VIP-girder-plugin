// Import utilities
import _ from 'underscore';
import { wrap } from '@girder/core/utilities/PluginUtils';
import { AccessType } from '@girder/core/constants';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn } from '../utilities';
//import events from 'girder/events';

// Import views
import ItemView from '@girder/core/views/body/ItemView';

// Import about Creatis
import ButtonListPipeline from '../templates/buttonListPipeline.pug';

// Add an entry to the ItemView
wrap(ItemView, 'render', function(render) {

  if ( ! hasTheVipApiKeyConfigured() || ! isPluginActivatedOn(this.model) {
    return;
  }

  this.once('g:rendered', () => {

    // Add a button in an item to get the list of pipelines
    if (this.model.get('_accessLevel') >= AccessType.READ) {

      // For each entry of file, add a button to get pipelines
      var selector = 'li.g-file-list-entry';
      _.each(this.$(selector), function (el) {
        var fileCid = $(el).find('.g-file-list-link').attr('cid');
        var fileId = this.fileListWidget.collection.get(fileCid).id;

        $(el).find('.g-show-info').after(ButtonListPipeline({fileId: fileId}));

      }, this);
    }
  });
  return render.call(this);
});
