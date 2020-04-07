// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { AccessType } from '@girder/core/constants';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn } from '../utilities/vipPluginUtils';

// Import views
import FileListWidget from '@girder/core/views/widgets/FileListWidget';

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
      this.$('li.g-file-list-entry.g-show-info[file-cid=' + file.cid + ']')
        .after(ButtonLaunchPipeline({model: file}));
    });
  }
  return this;
});

FileListWidget.prototype.events['click a.vip-launch-pipeline'] = function (e) {
    var cid = $(e.currentTarget).parent().attr('model-cid');
    var fileId = this.collection.get(cid).id;
    router.navigate("#file/" + fileId + "/#pipelines", {trigger: true});
};