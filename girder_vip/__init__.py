# -----------------------------------------------------------------------------
# Description : Girder plugin to use VIP's applications.
#
# Author      : Frederic Cervenansky <frederic.cervenansky@creatis.insa-lyon.fr>
#               Axel Bonnet <axel.bonnet@creatis.insa-lyon.fr>
#
# Copyright (C) 2018
# -----------------------------------------------------------------------------

from pathlib import Path

# from Girder
from girder.plugin import GirderPlugin, registerPluginStaticContent
from girder.models.user import User as UserModel
from girder.constants import AccessType

# Local imports
from . import execution_rest
from . import favorite_pipeline_rest
from .vipHandler import VipHandler


class VipPlugin(GirderPlugin):
    DISPLAY_NAME = 'VIP applications'

    def load(self, info):
        registerPluginStaticContent(
            plugin = 'vip',
            js=['/vip-plugin.umd.js'],
            css=[],
            staticDir=Path(__file__).parent / 'web_client' / 'dist',
            tree=info['serverRoot'],
        )
        vipHandler = VipHandler()
        # Model PipelineExecution
        info['apiRoot'].vip_execution = execution_rest.Execution()

        # Model FavoritePipeline
        info['apiRoot'].favorite_pipeline = favorite_pipeline_rest.FavoritePipeline()

        # Model User - extend user/
        UserModel().exposeFields(level=AccessType.READ, fields={'apiKeyVip'})
        info['apiRoot'].user.route('PUT', (':id', 'apiKeyVip'), vipHandler.setApiKeyVip)
        info['apiRoot'].user.route('GET', (':id', 'apiKeyVip'), vipHandler.getApiKeyVip)

        # expose plugin conf
        info['apiRoot'].system.route('GET', ('setting', 'vip_plugin'), vipHandler.getVipPluginConf)

        # Customizing the swagger page
        # Don't change this part
        baseTemplateFilename = info['apiRoot'].templateFilename
        info['apiRoot'].updateHtmlVars({
            'baseTemplateFilename': baseTemplateFilename
        })

#        templatePath = os.path.join(info['apiRoot'], 'server', 'custom_api_docs.mako') # pluginRootDir ne fonctionne pas remplace par apiRoot pour le moment FCY
#        info['apiRoot'].setTemplatePath(templatePath)
