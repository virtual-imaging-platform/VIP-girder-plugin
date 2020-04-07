// Import utilities
import _ from 'underscore';
import { wrap } from '@girder/core/utilities/PluginUtils';
import { AccessType } from '@girder/core/constants';
import events from '@girder/core/events';
import router from '@girder/core/router';
import { restRequest } from '@girder/core/rest';
import FileCollection from '@girder/core/collections/FileCollection';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn, messageGirder } from '../utilities/vipPluginUtils';

// Import views
import ItemListWidget from '@girder/core/views/widgets/ItemListWidget';
import LoadingAnimation from '@girder/core/views/widgets/LoadingAnimation';

// Import Templates
import ButtonLaunchPipeline from '../templates/buttonLaunchPipeline.pug';

// Add an entry to the FolderView
wrap(ItemListWidget, 'render', function(render) {
  render.call(this);

  // parentView is a HierarchyView
  if ( ! hasTheVipApiKeyConfigured()
          || ! isPluginActivatedOn(this.parentView.parentModel)) {
    return this;
  }

  this.collection.chain()
  .filter(item => item.get('_accessLevel') >= AccessType.READ)
  .each(item => {
    var itemNameEl =
      this.$('li.g-item-list-entry a.g-item-list-link[g-item-cid = ' + item.cid +  ']');
    if (this._viewLinks) {
      itemNameEl
        .siblings('.g-item-size')
        .before(ButtonLaunchPipeline({model: item}));
    } else {
      itemNameEl
        .parent()
        .append(ButtonLaunchPipeline({model: item}));
    }
  });
});

ItemListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
  var cid = $(e.currentTarget).attr('model-cid');
  var itemId = this.collection.get(cid).id;

  new LoadingAnimation({
    el: this.$el,
    parentView: this
  }).render();

  // fetch item files
  this.itemFiles = new FileCollection();
  this.itemFiles.altUrl = 'item/' +itemId + '/files';
  this.itemFiles.append = true; // Append, don't replace pages
  this.itemFiles
    .on('g:changed', () => this.onItemFilesReceived())
    .fetch();
};


ItemListWidget.prototype.onItemFilesReceived = function () {

  if (this.itemFiles.length === 0) {
    messageGirder("info", "VIP can not launch a pipeline on this item because it does not have any file")
  } else if (this.itemFiles.length > 1) {

    var params = {
      text: 'This item has several files. Do you want to see the file list to launch a VIP pipeline on any of them ?',
      yesText: 'OK',
      yesClass: 'btn-primary',
      confirmCallback: () => {
        this.trigger('g:navigateTo', ItemView, {
          item: item
        });
      }
    };
    confirm(params);
  } else {
    // it's OK
    this.trigger('g:navigateTo', ListPipelines, {
      file: this.itemFiles.pop()
    });
  }

};
