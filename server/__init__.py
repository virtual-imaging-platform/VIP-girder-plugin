import os
from girder.models.user import User as UserModel
from girder.constants import AccessType
from . import pipeline_rest
from . import user_rest

def load(info):
    # Model PipelineExecution
    info['apiRoot'].pipeline_execution = pipeline_rest.PipelineExecution()

    # Model User
    UserModel().exposeFields(level=AccessType.READ, fields={'apiKeyVip'})
    user = user_rest.UserExtend()
    info['apiRoot'].user.route('GET', (':id', 'apiKeyVip'), user.getApiKeyVip)
    info['apiRoot'].user.route('PUT', (':id', 'apiKeyVip'), user.setApiKeyVip)

    # Customizing the swagger page
    baseTemplateFilename = info['apiRoot'].templateFilename
    info['apiRoot'].updateHtmlVars({
	'baseTemplateFilename': baseTemplateFilename
    })

    templatePath = os.path.join(info['pluginRootDir'], 'server', 'custom_api_docs.mako')
    info['apiRoot'].setTemplatePath(templatePath)
