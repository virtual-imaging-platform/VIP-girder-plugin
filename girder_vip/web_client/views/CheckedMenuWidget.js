// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import events from '@girder/core/events';
import { ENABLE_MULTIFILES } from '../constants';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn, messageGirder } from '../utilities/vipPluginUtils';

// Import views
import { confirm } from '@girder/core/dialog'
import CheckedMenuWidget from '@girder/core/views/widgets/CheckedMenuWidget';
import HierarchyWidget from '@girder/core/views/widgets/HierarchyWidget';
import ListPipelinesMultiFiles from './ListPipelinesMultiFiles';

// Import templates
import CheckedMenuTemplate from '../templates/checkedActionsMenu.pug';

// Remark: Set the variable ENABLE_MULTIFILES to true in /vip/web_client/constants.js to display this component

wrap(CheckedMenuWidget, 'render', function(render) {
  // Call the parent render
  render.call(this);

  // parentView is a HierarchyView
  if ( ! hasTheVipApiKeyConfigured() || ! ENABLE_MULTIFILES
          || ! isPluginActivatedOn(this.parentView.parentModel) ) {
    return this;
  }

  // Display the "application" button in the multifiles menu
  this.$('.g-checked-menu-header').after(CheckedMenuTemplate({
    'itemCount': this.itemCount
  }));

  return this;
});

HierarchyWidget.prototype.events['click a.creatis-pipelines-checked'] = function (e) {
  var itemsIds = this._getCheckedResourceParam(true).item;

  if (itemsIds.length === 0) {
    messageGirder("danger", "No item selected to launch a VIP pipeline.")
    return;
  }

  var params = {
    text: 'Are you sure you want to launch a VIP pipeline on the '
    + itemsIds.length + ' selected items ?',
    yesText: 'OK',
    yesClass: 'btn-primary',
    confirmCallback: () => {
      events.trigger('g:navigateTo', ListPipelinesMultiFiles, {
        itemsIds: itemsIds
      });
    }
  };
  confirm(params);

  // When the object is in the form that we want, redirect to ListPipelinesMultiFiles
};
