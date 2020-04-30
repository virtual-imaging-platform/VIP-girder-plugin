//Import utilities

// Import views
import View from '@girder/core/views/View';
import '@girder/core/utilities/jquery/girderModal';

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
  }

});

export default FileSelectorModal;
