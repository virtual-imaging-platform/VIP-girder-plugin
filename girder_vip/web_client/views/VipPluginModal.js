// Import utilities
import { handleOpen } from '@girder/core/dialog';
import { parseQueryString, splitRoute } from '@girder/core/misc';
import router from '@girder/core/router';

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
    router.navigate(this.route + routeToAdd);
    handleOpen(dialogName, {replace : true}, dialogParam);
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
