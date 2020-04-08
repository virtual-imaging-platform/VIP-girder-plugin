// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { AccessType } from '@girder/core/constants';
import events from '@girder/core/events';
import router from '@girder/core/router';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn } from '../utilities/vipPluginUtils';
import ListPipelinesWidget from './ListPipelinesWidget';

// Import views
import FileListWidget from '@girder/core/views/widgets/FileListWidget';
import ItemView from '@girder/core/views/body/ItemView';

// Import about Creatis
import ButtonLaunchPipeline from '../templates/buttonLaunchPipeline.pug';

// Add an entry to the ItemView
wrap(FileListWidget, 'render', function(render) {
  render.call(this);

  var item = this.parentItem;
  if (! hasTheVipApiKeyConfigured() || ! isPluginActivatedOn(item)) {
    return this;
  }

  if (item.get('_accessLevel') >= AccessType.READ) {
    this.collection.each(file => {
      this.$('li.g-file-list-entry .g-show-info[file-cid=' + file.cid + ']')
        .after(ButtonLaunchPipeline({model: file}));
    });
  }

  if (this.parentView.showVipPipeline) {
    this.showPipelinesModal(this.vipPipelineFileId);
  }

  return this;
});

FileListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
  var cid = $(e.currentTarget).attr('model-cid');

  router.navigate('item/' + this.parentItem + '/file/' + this.collection.get(fileId).id + '/vip-pipelines');
  this.showPipelinesModal(cid);
};

FileListWidget.prototype.showPipelinesModal = function (fileId) {
  new ListPipelinesWidget({
      el: $('#g-dialog-container'),
      file: this.collection.get(fileId),
      item: this.parentItem,
      parentView: this.parentView
  });
};

wrap(ItemView, 'initialize', function(initialize, settings) {

  this.showVipPipeline = settings.showVipPipeline || false;
  this.vipPipelineFileId = settings.vipPipelineFileId || false;

  // Call the parent render
  initialize.call(this, settings);
});
