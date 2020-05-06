// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn } from '../utilities/vipPluginUtils';

// Import views
import FileListWidget from '@girder/core/views/widgets/FileListWidget';
import ListPipelinesWidget from './ListPipelinesWidget';

// Import about Creatis
import ButtonLaunchPipeline from '../templates/buttonLaunchPipeline.pug';

// Ancestor : ItemView
wrap(FileListWidget, 'render', function(render) {
  render.call(this);

  if (! hasTheVipApiKeyConfigured() ){
    return this;
  }

  this.activateSelectMode();

  isPluginActivatedOn(this.parentItem)
  .then(isPluginActivated => {
    if (! isPluginActivated || this.selectMode) return;

    this.collection.each(file => {
      this.$('li.g-file-list-entry .g-show-info[file-cid=' + file.cid + ']')
        .after(ButtonLaunchPipeline({model: file}));
    });
  });

  return this;
});

// Ancestor : ItemView
wrap(FileListWidget, 'initialize', function(initialize, settings) {
  settings = settings || {};
  this.selectMode = settings.selectMode;
  this.onFileClick = settings.onFileClick;
  return initialize.call(this, settings);
});

FileListWidget.prototype.activateSelectMode = function () {
  if ( ! this.selectMode) return;

  this.$('.g-file-list-entry a').not('.g-file-list-link').addClass('hidden');
  this.$('.g-file-list-entry .g-file-actions-container').addClass('hidden');
  this.$('.g-file-list-entry a.g-file-list-link')
    .removeAttr('target href rel')
    .attr('title', 'Select file');
};

FileListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
  var cid = $(e.currentTarget).attr('model-cid');
  new ListPipelinesWidget({
      el: $('#g-dialog-container'),
      file: this.collection.get(cid),
      item: this.parentItem,
      parentView: this
  });
};

FileListWidget.prototype.events['click a.g-file-list-link'] = function (e) {
  var cid = $(e.currentTarget).attr('cid');
  if (this.selectMode) {
    this.onFileClick && this.onFileClick(this.collection.get(cid));
  }
};
