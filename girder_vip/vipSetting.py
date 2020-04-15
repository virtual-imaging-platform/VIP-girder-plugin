import jsonschema

from girder.exceptions import ValidationException
from girder.utility import setting_utilities


class VipPluginSettings(object):
    SETTING_KEY = 'vip_plugin.settings'


@setting_utilities.default(VipPluginSettings.SETTING_KEY)
def _defaultVipSettings():
    return {
        'vip_url' : 'https://vip.creatis.insa-lyon.fr/rest',
        'vip_external_storage_name' : 'TOCHANGE',
        'authorized_collections' : []
    }


@setting_utilities.validator(VipPluginSettings.SETTING_KEY)
def _validateVipSettings(doc):
    vipSettingsSchema = {
        'type': 'object',
        'properties': {
            'vip_url': {
                'type': 'string'
            },
            'vip_external_storage_name': {
                'type': 'string'
            },
            'authorized_collections': {
                'type': 'array',
                'items': {
                    'type': 'string'
                }
            }
        },
        'required': ['vip_url', 'vip_external_storage_name', 'authorized_collections']
    }
    try:
        jsonschema.validate(doc['value'], vipSettingsSchema)
    except jsonschema.ValidationError as e:
        raise ValidationException('Invalid vip plugin settings : ' + str(e))
