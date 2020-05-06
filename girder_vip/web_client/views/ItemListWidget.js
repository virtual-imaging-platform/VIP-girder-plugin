// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';

import router from '@girder/core/router';
import FileCollection from '@girder/core/collections/FileCollection';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn, messageGirder } from '../utilities/vipPluginUtils';
import { confirm } from '@girder/core/dialog';

// Import views
import ItemListWidget from '@girder/core/views/widgets/ItemListWidget';
import ListPipelinesWidget from './ListPipelinesWidget';
import FolderView from '@girder/core/views/body/FolderView';
import CollectionView from '@girder/core/views/body/CollectionView';
import ConfirmExecutionDialog from './ConfirmExecutionDialog';

// Import Templates
import ButtonLaunchPipeline from '../templates/buttonLaunchPipeline.pug';

// Ancestors : CollectionView or FolderView > HierarchyWidget
wrap(ItemListWidget, 'render', function(render) {
  render.call(this);

  // there is a bug, there's a first render before the item collection is loaded
  if (! this.passageNumber) {
    this.passageNumber = 1;
    return this;
  }

  if ( ! this._downloadLinks || ! hasTheVipApiKeyConfigured() ){
    return this;
  }

  // parentView is a HierarchyView
  isPluginActivatedOn(this.parentView.parentModel)
  .then(isPluginActivated => {
    if (! isPluginActivated) return;

    this.collection.each(item => {
      var itemNameEl =
        this.$('li.g-item-list-entry a.g-item-list-link[g-item-cid = ' + item.cid +  ']');
      if (this._viewLinks) {
        itemNameEl.siblings('.g-item-size')
          .before(ButtonLaunchPipeline({model: item}));
      } else {
        itemNameEl.parent()
          .append(ButtonLaunchPipeline({model: item}));
      }
    });
  });

  return this;
});

ItemListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
  var cid = $(e.currentTarget).attr('model-cid');
  this.fetchFilesForItem(this.collection.get(cid));
};

ItemListWidget.prototype.fetchFilesForItem = function (item) {
  this.itemToLaunch = item;
  // fetch item files
  this.itemFiles = new FileCollection();
  this.itemFiles.altUrl = 'item/' + this.itemToLaunch.id + '/files';
  this.itemFiles.append = true; // Append, don't replace pages
  this.itemFiles
    .on('g:changed', () => this.onItemFilesReceived())
    .fetch();
};

ItemListWidget.prototype.onItemFilesReceived = function () {
  if (this.itemFiles.length === 0) {
    messageGirder("warning", "VIP can not launch a pipeline on this item because it does not have any file")
  } else if (this.itemFiles.length > 1) {
    this.showConfirmModal();
  } else {
    var file = this.itemFiles.pop();
    this.showPipelinesModal(file);
  }
};

ItemListWidget.prototype.showConfirmModal = function (file) {
  var params = {
    text: 'This item has several files. Do you want to see the file list to launch a VIP pipeline on any of them ?',
    yesText: 'OK',
    yesClass: 'btn-primary',
    confirmCallback: () => router.navigate('item/' + this.itemToLaunch.id, {trigger : true})
  };
  confirm(params);
};

ItemListWidget.prototype.showPipelinesModal = function (file) {
  new ListPipelinesWidget({
      el: $('#g-dialog-container'),
      file: file,
      item: this.itemToLaunch,
      parentView: this
  });
};
