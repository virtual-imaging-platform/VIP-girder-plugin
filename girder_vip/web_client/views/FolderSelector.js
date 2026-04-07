// Import utilities
const CollectionCollection = girder.collections.CollectionCollection;
import { getVipConfig } from '../utilities/vipPluginUtils';

// Import views
const BrowserWidget = girder.views.widgets.BrowserWidget;

var FolderSelector = BrowserWidget.extend({
    initialize: function (settings) {
        settings = settings || {};
        getVipConfig().then(vipConfig => this.initWithVipConfig(vipConfig, settings));
    },

    initWithVipConfig: function (vipConfig, settings) {
        const filteredCollections = new CollectionCollection();
        filteredCollections.filterFunc =
            (c => _.contains(vipConfig.authorized_collections, c._id));

        const rootSelectorSettings = {
            display: ['Home', 'VIP Authorized Collections'],
            groups: {'VIP Authorized Collections': filteredCollections}
        };

        BrowserWidget.prototype.initialize.call(this, _.extend({
            parentView: this,
            showItems: true,
            selectItem: false,
            highlightItem: true,
            removeItemInfo: true,
            titleText: 'Select a folder',
            submitText: 'Select',
            rootSelectorSettings: rootSelectorSettings,
            defaultSelectedResource: settings.defaultSelectedFolder,
        }, settings));

        this.render();
    },

    _resetErrors: function() {
        this.$('.g-validation-failed-message').addClass('hidden');
        this.$('.g-selected-model').removeClass('has-error');
        this.$('.g-input-element').removeClass('has-error');
    },

    _validate: function () {
        this._resetErrors();
        const folder = this.selectedModel();
        if (!folder) {
            this.validate = () => Promise.reject("Please select a folder");
            BrowserWidget.prototype._validate.call(this);
            return;
        }

        this.$el.modal('hide');
        this.trigger('g:saved', folder);
    },
});

export default FolderSelector;