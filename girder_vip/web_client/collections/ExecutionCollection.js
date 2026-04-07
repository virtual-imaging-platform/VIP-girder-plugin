// Import utilities
const { SORT_DESC } = girder.constants;

const Collection = girder.collections.Collection;

import ExecutionModel from '../models/ExecutionModel';

var ExecutionCollection = Collection.extend({
    resourceName: 'vip_execution',
    model: ExecutionModel,
    sortField: 'timestampCreation',
    sortDir: SORT_DESC
});

export default ExecutionCollection;
