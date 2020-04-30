//Import utilities
import _ from 'underscore';
import { restRequest } from '@girder/core/rest';
import { handleOpen } from '@girder/core/dialog';
import { parseQueryString, splitRoute } from '@girder/core/misc';
import router from '@girder/core/router';
import { cancelRestRequests } from '@girder/core/rest';
import * as constants from '../constants';
import { hasTheVipApiKeyConfigured, sortPipelines, messageGirder, doVipRequest, verifyApiKeysConfiguration } from '../utilities/vipPluginUtils';

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

export default ListPipelinesWidget;
