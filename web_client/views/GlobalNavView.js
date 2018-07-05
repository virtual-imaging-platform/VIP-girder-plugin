// Import utilities
import { wrap } from 'girder/utilities/PluginUtils';

// Import views
import LayoutGlobalNav from 'girder/views/layout/GlobalNavView';

// Import templates
import LayoutGlobalNavTemplate from '../templates/globalNav.pug';

// Add new element to navbar (menu)
wrap(LayoutGlobalNav, 'render', function(render) {
  //$(".g-global-nav").after(LayoutGlobalNavTemplate());
  this.once('g:rendered', () => {
    console.log("nav");
    //$(".g-global-nav").append(LayoutGlobalNavTemplate());

    // // For each entry of file, add a button to get pipelines
    // var selector = 'li.g-file-list-entry';
    // _.each(this.$(selector), function (el) {
    //   var fileCid = $(el).find('.g-file-list-link').attr('cid');
    //   var fileId = this.fileListWidget.collection.get(fileCid).id;
    //
    //   $(el).find('.g-show-info').after(ButtonListPipeline({fileId: fileId}));
    //
    // }, this);
  });
  return render.call(this);
});
