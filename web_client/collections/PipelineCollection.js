import Collection from 'girder/collections/Collection';

import PipelineModel from '../models/PipelineModel';

var PipelineCollection = Collection.extend({
    resourceName= 'pipeline',
    model: PipelineModel
});

export default PipelineCollection;
