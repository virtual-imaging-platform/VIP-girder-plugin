//Import utilities

// Import views
import View from '@girder/core/views/View';
import '@girder/core/utilities/jquery/girderModal';
import BrowserWidget from '@girder/core/views/widgets/BrowserWidget';

// Import templates
import FileSelectorTemplate from '../templates/fileSelector.pug';

// List of pipelines allowed by the user
var FileSelectorModal = View.extend({

  events: {
    'click button.confirm-pipeline' : 'confirmPipeline'
  },

  initialize: function (settings) {
      this.render();
  },

  render: function () {

    this.$el.html( FileSelectorTemplate() );
    this.$el.girderModal(this);

    return this;
  },

  _openBrowser: function () {
      this._browserWidgetView.setElement($('#g-dialog-container')).render();
  }

});

export default FileSelectorModal;
