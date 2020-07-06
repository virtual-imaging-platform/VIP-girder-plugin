import Model from '@girder/core/models/Model';
import { restRequest } from '@girder/core/rest';

var ExecutionModel = Model.extend({
    resourceName: "vip_execution",

    saveStatus: function() {
        return restRequest({
            url: 'vip_execution/' + this.id + '/status',
            method: 'PUT',
            data: {status : this.get('status')}
        });
    }
});

export default ExecutionModel;
