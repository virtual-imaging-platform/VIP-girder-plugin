// Import utilities
import _ from 'underscore';
import router from '@girder/core/router';
import { wrap } from '@girder/core/utilities/PluginUtils';
import events from '@girder/core/events';
import { ENABLE_MULTIFILES } from '../constants';
import { hasTheVipApiKeyConfigured, isPluginActivatedOn } from '../utilities';

// Import views
import CheckedMenuWidget from '@girder/core/views/widgets/CheckedMenuWidget';
import ListPipelinesMultiFiles from './ListPipelinesMultiFiles';

// Import templates
import CheckedMenuTemplate from '../templates/checkedActionsMenu.pug';

// Remark: Set the variable ENABLE_MULTIFILES to true in /vip/web_client/constants.js to display this component

// Add an entry to the FolderView
wrap(CheckedMenuWidget, 'render', function(render) {
  // Call the parent render
  render.call(this);


  // parentView is a HierarchyView
  if ( ! hasTheVipApiKeyConfigured || ! ENABLE_MULTIFILES
          || ! isPluginActivatedOn(this.parentView.parentModel) ) {
    return this;
  }

  // Display the "application" button in the multifiles menu
  this.$('.g-checked-menu-header').after(CheckedMenuTemplate({
    'itemCount': this.itemCount
  }));

  // Action 'click' on the "application" button to access to 'ListPipelines' page
  $('.creatis-pipelines-checked').click(function (e) {
    var items = JSON.parse(this.parentView._getCheckedResourceParam());
    var obj = {};

    var tmp = _.reduce(items, function (i, item){
      return _.extend(i, item);
    });

    // The result must be in the form: {1:{id: ...}, 2:{id: ...}}
    _.each(tmp, function (item, i){
      obj[i] = {id: item};
    });

    // When the object is in the form that we want, redirect to ListPipelinesMultiFiles
    events.trigger('g:navigateTo', ListPipelinesMultiFiles, {
      items: obj
    });

  }.bind(this));

  return this;
});
