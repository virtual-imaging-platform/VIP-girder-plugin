// Import utilities
import { SORT_DESC } from 'girder/constants';

import Collection from 'girder/collections/Collection';

import PipelineModel from '../models/PipelineModel';

var PipelineCollection = Collection.extend({
    resourceName: 'pipeline_execution',
    model: PipelineModel,
    sortField: 'timestampCreation',
    sortDir: SORT_DESC
});

export default PipelineCollection;
