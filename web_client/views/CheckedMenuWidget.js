// Import utilities
import _ from 'underscore';
import router from 'girder/router';
import { wrap } from 'girder/utilities/PluginUtils';
import events from 'girder/events';

// Import views
import CheckedMenuWidget from 'girder/views/widgets/CheckedMenuWidget';
import ListPipelinesMultiFiles from './ListPipelinesMultiFiles';

// Import templates
import CheckedMenuTemplate from '../templates/checkedActionsMenu.pug';

// Add an entry to the FolderView
wrap(CheckedMenuWidget, 'render', function(render) {
  render.call(this);

  this.$('.g-checked-menu-header').after(CheckedMenuTemplate({
    'itemCount': this.itemCount
  }));

  var items = JSON.parse(this.parentView._getCheckedResourceParam());
  var obj = {};

  var tmp = _.reduce(items, function (i, item){
    return _.extend(i, item);
  });

  _.each(tmp, function (item, i){
    obj[i] = {id: item};
  });

  $('.creatis-pipelines-checked').click(function (e) {
    var items = this.parentView._getCheckedResourceParam();

    events.trigger('g:navigateTo', ListPipelinesMultiFiles, {
      items: obj
    });

    router.navigate('pipelines-multi-files');

  }.bind(this));

  return this;
});
