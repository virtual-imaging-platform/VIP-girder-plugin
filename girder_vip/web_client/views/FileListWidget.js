// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { AccessType } from '@girder/core/constants';
import events from '@girder/core/events';
import router from '@girder/core/router';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn, messageGirder } from '../utilities/vipPluginUtils';
import ListPipelinesWidget from './ListPipelinesWidget';

// Import views
import FileListWidget from '@girder/core/views/widgets/FileListWidget';
import ItemView from '@girder/core/views/body/ItemView';

// Import about Creatis
import ButtonLaunchPipeline from '../templates/buttonLaunchPipeline.pug';

// Ancestor : ItemView
wrap(FileListWidget, 'render', function(render) {
  render.call(this);

  if (! this.canRenderVipPlugin(this.parentItem)) {
    return this;
  }

  if (this.parentItem.get('_accessLevel') >= AccessType.READ) {
    this.collection.each(file => {
      this.$('li.g-file-list-entry .g-show-info[file-cid=' + file.cid + ']')
        .after(ButtonLaunchPipeline({model: file}));
    });
  }

  if (this.parentView.showVipPipelines) {
    this.showPipelinesModal(this.parentView.vipPipelineFileId);
    this.parentView.showVipPipelines = false;
  }

  return this;
});

// return true if render must be done
FileListWidget.prototype.canRenderVipPlugin = function (item) {
  var showModal = this.parentView.showVipPipelines;
  var isApiKeyOk = hasTheVipApiKeyConfigured();
  var isPluginActivated = isPluginActivatedOn(item);

  if (!showModal) {
    return isApiKeyOk && isPluginActivated;
  }

  // show modal requested
  var error;
  if ( ! isApiKeyOk) {
    error = 'Your VIP API key is not configured in your girder account';
  } else if ( ! isPluginActivated) {
    error = 'VIP applications cannot be used in this collection';
  } else if ( ! this.collection.get(this.parentView.vipPipelineFileId)) {
    error = 'You cannot launch a VIP pipeline on this file because it does not exist in this item';
  } else {
    // OK
    return true;
  }
  // there's an error

  this.parentView.showVipPipelines = false;
  messageGirder('danger', error);
  router.navigate('/item/' + item.id, {replace: true});
  return false;

};

FileListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
  var cid = $(e.currentTarget).attr('model-cid');

  var currentRoute = Backbone.history.fragment;
  router.navigate(currentRoute + '/file/' + this.collection.get(cid).id + '?dialog=vip-pipelines');
  this.showPipelinesModal(cid);
};

FileListWidget.prototype.showPipelinesModal = function (fileId) {
  new ListPipelinesWidget({
      el: $('#g-dialog-container'),
      file: this.collection.get(fileId),
      item: this.parentItem,
      parentView: this
  });
};

wrap(ItemView, 'initialize', function(initialize, settings) {

  this.showVipPipelines = settings.showVipPipelines || false;
  this.vipPipelineFileId = settings.vipPipelineFileId || false;

  // Call the parent render
  initialize.call(this, settings);
});
