from girder.api.rest import Resource, filtermodel
from girder import logger
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from .models.execution import Execution as ExecutionModel
import json

# Create new route pipeline_execution
class Execution(Resource):
    def __init__(self):
        super(Execution, self).__init__()
        self.resourceName = 'vip_execution' # Name of the collection in the bdd
        self.model = ExecutionModel()

        self.route('GET', (), self.get)
        self.route('GET', (':id',), self.getById)
        self.route('POST', (), self.createExecution)
        self.route('PUT', (':id', 'status'), self.setStatus)
        self.route('DELETE', (':id',), self.deleteProcess)

    @access.public
    @autoDescribeRoute(
	Description("Get all process")
    )
    def get(self):
        list = []
        for execution in self.model.get():
            list.append(execution)

        return list

    @access.public
    @autoDescribeRoute(
    Description("Get an execution by id")
    .modelParam('id', 'The ID of the execution', model=ExecutionModel,
    destName='execution')
    .errorResponse('ID was invalid')
    )
    def getById(self, execution):
        return execution

    @access.public
    @autoDescribeRoute(
    Description("Insert a new execution")
    .param('name', 'Name of execution', strip=True)
    .jsonParam('fileId', 'IDs of the files that are processed', requireObject=True)
    .param('pipelineName', 'Name of pipeline launched', strip=True)
    .param('vipExecutionId', 'ID of the exection on VIP')
    .param('idFolderResult', 'The folder id where the results are stored')
    .param('status', 'Status of execution', default='null')
    .param('sendMail', 'Send an email when the execution has finished', dataType='boolean', default=False)
    .param('timestampFin', 'Date of end of the execution', required=False)
    )
    def createExecution(self, params):
        return self.model.createExecution(params, self.getCurrentUser())

    @access.public
    @autoDescribeRoute(
       Description("Set status of exection")
       .modelParam('id', 'The ID of the execution', model=ExecutionModel, destName='execution')
       .param('status', 'The new status')
    )
    def setStatus(self, execution, status):
        self.model.setStatus(execution, status)
        return {'message': 'Status was changed'}

    # TODO Ajouter dans modelParam un argument level=AccessType.ADMIN
    # Pour controller les acces, etendre le model a AccessControlledModel
    @access.public
    @autoDescribeRoute(
    Description("Delete an execution")
    .modelParam('id', 'The ID of the execution to delete', model=ExecutionModel,
    destName='execution')
    )
    def deleteProcess(self, execution):
        self.model.remove(execution)
        return {'message': 'Deleted execution %s.' % execution['name']}
