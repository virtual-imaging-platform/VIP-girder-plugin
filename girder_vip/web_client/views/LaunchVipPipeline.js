// Import utilities
import events from '@girder/core/events';
import { wrap } from '@girder/core/utilities/PluginUtils';
import CollectionCollection from '@girder/core/collections/CollectionCollection';

// Import views
import View from '@girder/core/views/View';
import HierarchyWidget from '@girder/core/views/widgets/HierarchyWidget';
import FileSelectorModal from './FileSelectorModal';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';

// Import templates
import LaunchTemplate from '../templates/launchVipPipeline.pug';

var LaunchVipPipeline = View.extend({
    initialize: function (settings) {

    var filteredCollections = new CollectionCollection();
    filteredCollections.filterFunc = c => c.name === 'Collection1';
    var rootSelectorSettings = {
      display: ['VIP Authorized Collections'],
      groups: {'VIP Authorized Collections' : filteredCollections}
    };

    // todo filters collections for root selector
    this._browserWidgetView = new BrowserWidget({
          parentView: this,
          showItems: true,
          selectItem: true,
          removeItemInfo: true,
          rootSelectorSettings: rootSelectorSettings
      });
    this.render();
  },

  events: {
    'click .select-girder-file' : 'chooseFile'
  },

  render: function (executions) {
    // Display the list of executions
    this.$el.html( LaunchTemplate() );

    return this;
  },

  // Delete a executon of the db
  chooseFile: function (e) {
      this._browserWidgetView.setElement($('#g-dialog-container')).render();
  }

}, {
    fetchAndInit: function (application, version) {
      events.trigger('g:navigateTo', LaunchVipPipeline);
    }
});

wrap(BrowserWidget, 'initialize', function(initialize, settings) {
  settings = settings || {};
  this.removeItemInfo = settings.removeItemInfo || false;

  // Call the parent init
  initialize.call(this, settings);
});

// replace to remove _downloadLinks, _viewLinks and _showSizes from the
// hierarchy widget
wrap(BrowserWidget, '_renderHierarchyView', function(_renderHierarchyView) {
  if (this._hierarchyView) {
      this.stopListening(this._hierarchyView);
      this._hierarchyView.off();
      this.$('.g-hierarchy-widget-container').empty();
  }
  if (!this.root) {
      return;
  }
  this.$('.g-wait-for-root').removeClass('hidden');
  this._hierarchyView = new HierarchyWidget({
      el: this.$('.g-hierarchy-widget-container'),
      parentView: this,
      parentModel: this.root,
      checkboxes: false,
      routing: false,
      showActions: false,
      showItems: this.showItems,
      downloadLinks: ! this.removeItemInfo,
      viewLinks: ! this.removeItemInfo,
      showSizes: ! this.removeItemInfo,
      onItemClick: _.bind(this._selectItem, this),
      defaultSelectedResource: this.defaultSelectedResource,
      highlightItem: this.highlightItem,
      paginated: this.paginated,
      showMetadata: this.showMetadata
  });
  this.listenTo(this._hierarchyView, 'g:setCurrentModel', this._selectModel);
  this._selectModel();
});

export default LaunchVipPipeline;
