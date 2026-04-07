const Model = girder.models.Model;
const { restRequest } = girder.rest;

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
