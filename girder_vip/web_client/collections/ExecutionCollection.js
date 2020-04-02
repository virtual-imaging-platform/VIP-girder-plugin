// Import utilities
import { SORT_DESC } from '@girder/core/constants';

import Collection from '@girder/core/collections/Collection';

import ExecutionModel from '../models/ExecutionModel';

var ExecutionCollection = Collection.extend({
    resourceName: 'vip_execution',
    model: ExecutionModel,
    sortField: 'timestampCreation',
    sortDir: SORT_DESC
});

export default ExecutionCollection;
