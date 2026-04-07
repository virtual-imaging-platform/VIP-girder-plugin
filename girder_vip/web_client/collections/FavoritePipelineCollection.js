// Import utilities
const Collection = girder.collections.Collection;
const { restRequest } = girder.rest;

// Import models
import FavoritePipelineModel from '../models/FavoritePipelineModel';

const FavoritePipelineCollection = Collection.extend({
    resourceName: 'favorite_pipeline',
    model: FavoritePipelineModel,

    addFavoritePipeline: function (pipelineName) {
        return restRequest({
            method: 'POST',
            url: 'favorite_pipeline',
            data: { pipelineName: pipelineName }
        }).done((resp) => {
            this.add(resp);
        });
    }
});

export default FavoritePipelineCollection;