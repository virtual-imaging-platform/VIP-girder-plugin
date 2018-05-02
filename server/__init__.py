import os
from . import pipeline_rest

def load(info):
    info['apiRoot'].pipeline_execution = pipeline_rest.PipelineExecution()

    # Customizing the swagger page
    baseTemplateFilename = info['apiRoot'].templateFilename
    info['apiRoot'].updateHtmlVars({
	'baseTemplateFilename': baseTemplateFilename
    })

    templatePath = os.path.join(info['pluginRootDir'], 'server', 'custom_api_docs.mako')
    info['apiRoot'].setTemplatePath(templatePath)
