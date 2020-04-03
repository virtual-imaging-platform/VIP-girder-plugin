from girder import logprint
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.models.user import User
from girder.constants import AccessType
from girder.models.user import User as UserModel

VIP_FIELD = 'apiKeyVip'
class VipHandler(object):


    def __init__(self):
        super(VipHandler, self).__init__()
        self._model = UserModel()
        self.__users = User()


    @access.user
    @autoDescribeRoute(
       Description("Set vip's api key")
       .modelParam('id', model=UserModel, level=AccessType.WRITE)
       .param('apiKeyVip', 'The vip\'s api key')
    )
    def setApiKeyVip(self, user, apiKeyVip):
        user[VIP_FIELD] = apiKeyVip
        self._model.save(user)
        return {'message': 'Api Key VIP changed'}


    @access.user
    @autoDescribeRoute(
        Description('Get user\'s VIP api key')
        .modelParam('id', 'The ID of the user', model=UserModel, level=AccessType.READ)
    )
    def getApiKeyVip(self, user):
        if VIP_FIELD not in user:
            return ''
        return user[VIP_FIELD]