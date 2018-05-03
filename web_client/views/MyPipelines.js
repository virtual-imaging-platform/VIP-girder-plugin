// Import utilities
import { cancelRestRequests } from 'girder/rest';

// Import views
import View from 'girder/views/View';

// Import collections
import PipelineCollection from '../collections/PipelineCollection';

// Import models
import PipelineModel from '../models/PipelineModel';

// Import templates
import MyPipelinesTempalte from '../templates/myPipelines.pug';

var MyPipelines = View.extend({
  initialize: function (settings) {
    cancelRestRequests('fetch');

    this.collection = new PipelineCollection;
    const promiseArray = [];
    promiseArray.push(this.collection.fetch());

    $.when(...promiseArray).done(() => {
      this.listenTo(this.collection, 'g:changed', this.render);
      this.render();
    });
  },

  render: function () {
    this.$el.html(MyPipelinesTempalte({
      pipelines: this.collection.toArray()
    }));

    return this;
  }

});

export default MyPipelines;
