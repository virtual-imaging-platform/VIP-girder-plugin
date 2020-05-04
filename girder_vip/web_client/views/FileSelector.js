// Import utilities
import _ from 'underscore';
import events from '@girder/core/events';
import { wrap } from '@girder/core/utilities/PluginUtils';
import CollectionCollection from '@girder/core/collections/CollectionCollection';
import FileCollection from '@girder/core/collections/FileCollection';

// Import views
import View from '@girder/core/views/View';
import FileListWidget from '@girder/core/views/widgets/FileListWidget';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';

// import template
import FileSelectorTemplate from '../templates/fileSelector.pug';

// extends girder browser widget to :
// - only show configured collections
// - add an additionnal file selection step if the selected item has more than 1

var FileSelector = BrowserWidget.extend({
  // override initialise
  initialize: function (settings) {

    // only show configured collections
    var filteredCollections = new CollectionCollection();
    filteredCollections.filterFunc = c => c.name === 'Collection1';
    var rootSelectorSettings = {
      display: ['VIP Authorized Collections'],
      groups: {'VIP Authorized Collections' : filteredCollections}
    };

    // use girder browser in item mode
    BrowserWidget.prototype.initialize.call(this, {
        showItems: true,
        selectItem: true,
        removeItemInfo: true,
        rootSelectorSettings: rootSelectorSettings
    });
  },

  // override render
  render: function () {
    BrowserWidget.prototype.render.call(this);

    this.$('.modal-body.g-browser-widget').after( FileSelectorTemplate() );
    this.$('.modal-body.vip-file-selector').toggleClass('hidden');

    return this;
  },

  toggleFileSelector: function() {
    this.$('.modal-body.g-browser-widget').toggleClass('hidden');
    this.$('.modal-body.vip-file-selector').toggleClass('hidden');
  },

  // override internal validate
  _validate: function () {
    // fetch item files
    var item = this.selectedModel();
    if ( ! item) {
      // use girder browser error display
      this.validate = () => Promise.reject("Please select an item");
      BrowserWidget.prototype._validate.call(this);
      return;
    }

    // fetch the item files to see how many there are
    // use the fileListWidget as it fetch the file and we will show it if needed
    this.fileListWidget = new FileListWidget({
      item: item,
      parentView: this,
      selectMode: true,
      onFileClick: this.onFileSelected.bind(this),
      el: this.$('.vip-file-selector .file-list'),
    });
    this.fileListWidget.on('g:changed', () => this.onFileListReady() );
  },

  // file list widget ready (item files received during validation process)
  onFileListReady: function () {
    var itemFiles = this.fileListWidget.collection;
    if (itemFiles.length === 0) {
      // use girder browser error display
      this.validate = () => Promise.reject("This item does not have any file");
      BrowserWidget.prototype._validate.call(this);
    } else if (itemFiles.length === 1) {
      // it's ok
      this.validate = () => Promise.resolve();
      BrowserWidget.prototype._validate.call(this);
    } else {
      // there are several files, show the FileListWidget
      this.toggleFileSelector();
    }

  },

  // file selected in the fileListWidget
  onFileSelected: function (file) {
    // it's ok
    console.log('file selected : ' + file.get('name'));
    this.validate = () => Promise.resolve();
    BrowserWidget.prototype._validate.call(this);
  }

});

// remove the download and view (and rocket link) next to the items
// (only on this file selection use)
import HierarchyWidget from '@girder/core/views/widgets/HierarchyWidget';
wrap(HierarchyWidget, 'initialize', function(initialize, settings) {
  settings = settings || {};
  if (this.parentView instanceof FileSelector) {
    settings.downloadLinks = false;
    settings.viewLinks = false;
    this.viewVipRocket = false;
  }
  // Call the parent init
  initialize.call(this, settings);
});

export default FileSelector;
