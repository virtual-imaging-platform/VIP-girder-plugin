# -----------------------------------------------------------------------------
# Description : Girder plugin to use VIP's applications.
#           
# Author      : Frederic Cervenansky <frederic.cervenansky@creatis.insa-lyon.fr>
#               Axel Bonnet <axel.bonnet@creatis.insa-lyon.fr>
#
# Copyright (C) 2018
# -----------------------------------------------------------------------------

import os

# from Girder
from girder.plugin import GirderPlugin
from girder.models.user import User as UserModel
from girder.constants import AccessType

# Local imports
from . import execution_rest
from .vipHandler import VipHandler
from girder.plugin import GirderPlugin


class VipPlugin(GirderPlugin):
    DISPLAY_NAME = 'VIP applications'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        vipHandler = VipHandler()
        # Model PipelineExecution
        info['apiRoot'].vip_execution = execution_rest.Execution()

        # Model User - extend user/
        UserModel().exposeFields(level=AccessType.READ, fields={'apiKeyVip'})
        info['apiRoot'].user.route('PUT', (':id', 'apiKeyVip'), vipHandler.setApiKeyVip)
        info['apiRoot'].user.route('GET', (':id', 'apiKeyVip'), vipHandler.getApiKeyVip)

        # Customizing the swagger page
        # Don't change this part
        baseTemplateFilename = info['apiRoot'].templateFilename
        info['apiRoot'].updateHtmlVars({
            'baseTemplateFilename': baseTemplateFilename
        })

#        templatePath = os.path.join(info['apiRoot'], 'server', 'custom_api_docs.mako') # pluginRootDir ne fonctionne pas remplace par apiRoot pour le moment FCY
#        info['apiRoot'].setTemplatePath(templatePath)
