import Collection from 'girder/collections/Collection';

import PipelineModel from '../models/PipelineModel';

var PipelineCollection = Collection.extend({
    resourceName: 'pipeline_execution',
    model: PipelineModel
});

export default PipelineCollection;
