# VIP-girder-plugin

## Presentation

This is a girder plugin to launch executions on VIP with girder files as inputs and results transferred to a girder folder.
This plugin uses the CARMIN REST API to communicate with VIP and should also work with any procesing platform supporting CARMIN. This platform must support the `External platform` CARMIN module, and girder must be one of the external platform supported.

This plugins allows to :
- Use VIP from girder as from the VIP portal. It uses an user's API key to have the same permissions.
- Select a pipeline to use
- Select girder files as inputs
- Enter values for non-file inputs
- Choose the girder folder where the results will be written
- After the launch, follow in girder the advancement of the execution
- Easy access to the results when it is over

## Installation

The girder prod server is installed in a virtual env in the `$GIRDER_ENV` folder

1. Activate the virtualenv : `. $GIRDER_ENV/bin/activate`
1. Stop girder with a `kill $pid`
1. (si le plugin est déja installé) Désinstaller le plugin
   1. `pip uninstall girder_vip`
   1. `rm -rf $GIRDER_ENV/lib/python3.7/site-packages/girder_vip`
1. `pip install git+https://github.com/virtual-imaging-platform/VIP-girder-plugin.git@master`
1. `girder build` (it could be long)
1. `nohup girder serve &`

## Administator configuration

In the plugin configuration page, the girder administrator must :
- verify the vip url or select another CARMIN platform url
- enter the external platform name the girder server has in VIP. Please note that VIP must :
   - have the girder platform configured as an external platform
   - authorize the girder platform host to do CORS requests
- configure which collections the plugin can use as file inputs. By default there is none and only the private folders of the users will be usable by the plugin

## Usage

Each user must configure its own VIP api key in its girder account in order to activate the VIP plugin

## Development

The girder development server is installed in a virtual env in the `$GIRDER_ENV` folder.
The first time, the plugin needs to be intalled as in the production installation.

Then, to test client/javascript changes :
1. Activate the virtualenv : `. $GIRDER_ENV/bin/activate`
1. `girder build --watch-plugin vip` (let it run in a seperate shell)
  This will automatically rebuild the plugin when a file changes in `$GIRDER_ENV/lib/python3.7/site-packages/girder_vip/web_client/*/`
1. Change the source files to test
   1. Either directly in `$GIRDER_ENV/lib/python3.7/site-packages/girder_vip/web_client/*/`
   1. Either by fetching changes in a github repository : `pip install -I --no-deps git+https://github.com/my-github-user/VIP-girder-plugin.git@my-branch`. Les options `-I --no-deps` permettent d'écraser ce qui est déjà installé et de ne pas se soucier des dépendances.
