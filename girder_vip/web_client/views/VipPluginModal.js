// Import utilities
import _ from 'underscore';
import { handleOpen } from '@girder/core/dialog';
import { parseQueryString, splitRoute } from '@girder/core/misc';
import router from '@girder/core/router';
import { messageGirder } from '../utilities/vipPluginUtils';

import View from '@girder/core/views/View';

// Modal to fill parameters and launch the pipeline
var VipModal = View.extend({

  initRoute: function(dialogName, dialogParam) {
    this.route = Backbone.history.fragment
    var queryParams = parseQueryString(splitRoute(this.route).name);
    if (queryParams.dialog && queryParams.dialog == dialogName) {
      // route already OK
      return;
    }
    this.route = this.parentView.getRoute();
    var routeToAdd = '/file/' + this.file.id;
    if ( this.route.indexOf('item/') === -1) {
      routeToAdd = '/item/' + this.item.id + routeToAdd;
    }
    var queryPart = '?dialog=' + dialogName;
    // there is a bug in backbone, deal with spaces encoding ourselves
    if (dialogParam) {
      // replace ' ' by +, and encode the rest (so real + become %2B)
      var dialogParamParts = dialogParam.split(' ');
      dialogParam = _.map(dialogParamParts, p => encodeURIComponent(p)).join('+');
      if (dialogParam !== decodeURI(dialogParam)) {
          // unauthorized characters, use parent route
          router.navigate(this.parentView.getRoute(), {replace : true});
          this.route = Backbone.history.fragment;
          return;
      }
      queryPart += '&dialogid=' + dialogParam;
    }
    router.navigate(this.route + routeToAdd + queryPart, {replace : true});
    this.route = Backbone.history.fragment;

  },

  goToParentRoute: function (replace) {
    var currentRoute = Backbone.history.fragment;
    if (currentRoute === this.route) {
      // if the route has not already changed (back or loading custom url)
      router.navigate(this.parentView.getRoute(), {replace: replace});
    }
  },
});

export default VipModal;
