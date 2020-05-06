// Import utilities
import _ from 'underscore';
import events from '@girder/core/events';
import { wrap } from '@girder/core/utilities/PluginUtils';
import CollectionCollection from '@girder/core/collections/CollectionCollection';
import FileCollection from '@girder/core/collections/FileCollection';
import { getVipConfig } from '../utilities/vipPluginUtils';

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

  events : _.extend({
    'click .modal-footer a.btn-default' : function () {
            if (this.fileSelectMode) {
              toggleFileSelectMode();
            } else {
              this.$el.modal('hide');
            }
        }
  }, BrowserWidget.prototype.events),

  // override initialise
  initialize: function (settings) {
    settings = settings || {};
    this.selectedFile = settings.defaultSelectedFile;
    settings.defaultSelectedResource = settings.defaultSelectedItem;

    getVipConfig().then(vipConfig => this.initWithVipConfig(vipConfig, settings));
  },

  initWithVipConfig: function(vipConfig, settings) {
    // only show configured collections
    var filteredCollections = new CollectionCollection();
    filteredCollections.filterFunc =
     (c => _.contains(vipConfig.authorized_collections, c.id) );
    var rootSelectorSettings = {
      display: ['VIP Authorized Collections'],
      groups: {'VIP Authorized Collections' : filteredCollections}
    };

    // use girder browser in item mode
    BrowserWidget.prototype.initialize.call(this, _.extend({
        showItems: true,
        selectItem: true,
        highlightItem: true,
        removeItemInfo: true,
        submitText: 'Select',
        rootSelectorSettings: rootSelectorSettings
    }, settings) );

    // this should be done in BrowserWidget, that's a bug
    if (this.defaultSelectedResource) {
      this._selected = this.defaultSelectedResource;
    }

    this.render();
  },

  // override render
  render: function () {
    BrowserWidget.prototype.render.call(this);

    const defaultResourceFileName = (this.selectedFile
      && this.selectedFile.get('name'));
    this.$('.modal-body.g-browser-widget').after(
      FileSelectorTemplate({
        defaultSelectedFile: defaultResourceFileName
      })
    );
    this.$('.modal-body.vip-file-selector').toggleClass('hidden');
    this.$('.modal-footer a.btn-default').removeAttr('data-dismiss');
    this.fileSelectMode = false;

    return this;
  },

  toggleFileSelectMode: function() {
    this.fileSelectMode = ! this.fileSelectMode;
    this.$('.modal-body.g-browser-widget').toggleClass('hidden');
    this.$('.modal-body.vip-file-selector').toggleClass('hidden');
    this.$('.modal-footer a.btn-default').html(
      this.fileSelectMode ? 'Back' : 'Cancel'
    );
  },

  _resetErrors: function() {
    this.$('.g-validation-failed-message').addClass('hidden');
    this.$('.g-selected-model').removeClass('has-error');
    this.$('.g-input-element').removeClass('has-error');
    this.$('.vip-selected-file').removeClass('has-error');
  },

  // override internal validate
  _validate: function () {
    this._resetErrors();

    // first deal with file select mode
    if (this.fileSelectMode) {
      if ( ! this.selectedFile) {
        this.$('.vip-selected-file').addClass('has-error');
        this.$('.vip-file-selector .g-validation-failed-message').removeClass('hidden');
      } else {
        this.$el.modal('hide');
        this.trigger('g:saved', this.selectedModel(), this.selectedFile);
      }
      return;
    }

    // fetch item files
    var item = this.selectedModel();
    if ( ! item) {
      // use girder browser error display
      this.validate = () => Promise.reject("Please select an item");
      BrowserWidget.prototype._validate.call(this);
      return;
    }

    // save the current selected folder
    this.root = this._hierarchyView.parentModel;
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
      this.$el.modal('hide');
      this.trigger('g:saved', this.selectedModel(), itemFiles.at(0));
    } else {
      // there are several files, show the FileListWidget
      if (this.selectedFile && ! itemFiles.get(this.selectedFile)) {
        // check the default file is in there
        this.selectedFile = null;
        this.$('#vip-selected-file').val('');
      }
      this.toggleFileSelectMode();
    }

  },

  // file selected in the fileListWidget
  onFileSelected: function (file) {
    // it's ok
    this._resetErrors();
    this.selectedFile = file;
    this.$('#vip-selected-file').val(file.get('name'));
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
