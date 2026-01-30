// Import utilities
import { SORT_DESC } from '@girder/core/constants';
import { getCurrentUser } from '@girder/core/auth';

import Collection from '@girder/core/collections/Collection';

import ExecutionModel from '../models/ExecutionModel';

var ExecutionCollection = Collection.extend({
    resourceName: 'vip_execution',
    model: ExecutionModel,
    sortField: 'timestampCreation',
    sortDir: SORT_DESC,

    fetch: function(options = {}){
        const fetchPromise = Collection.prototype.fetch.call(this, options);
        // Filter the executions by userId
        fetchPromise.then(() => {
            const currentUserId = getCurrentUser().id;
            const filteredExecs = this.filter(execution => execution.get('userId') === currentUserId);
            this.reset(filteredExecs);
        });

        return fetchPromise;
    }
});

export default ExecutionCollection;
