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

## Requirements

- node >= 20
- npm >= 10
- python >= 3.10
- redis service installed and active ([installation guide](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/))

## Installation

The girder prod server is installed in a virtual env in the `$GIRDER_ENV` folder

1. Activate the virtualenv : `. $GIRDER_ENV/bin/activate`
1. Stop girder with a `kill $pid` (if already running)
1.  Uninstall plugin (if already installed)
   1. `pip uninstall girder_vip`
   1. `rm -rf $GIRDER_ENV/lib/pythonX/site-packages/girder_vip`
1. `pip install git+https://github.com/virtual-imaging-platform/VIP-girder-plugin.git@master`
2. Install Girder 5.x necessary dependencies : \
`pip install girder-plugin-worker`
3. Kill previous Girder workers (if already running) : \
`pkill -f 'celery -A girder_worker.app worker'`
4. Set necessary environment variables : \
`export GIRDER_WORKER_BROKER=redis://127.0.0.1:6379/0` \
`export GIRDER_WORKER_BACKEND=redis://127.0.0.1:6379/1`\
`export CELERY_BROKER_URL=redis://127.0.0.1:6379/0`
3. Launch background girder worker : \
`celery -A girder_worker.app worker -Q local --detach
--logfile=/tmp/girder-celery.log --pidfile=/tmp/girder-celery.pid`
2. Run `npm install` and `npm run build` in the `girder_vip/web_client` folder
1. `nohup girder serve &`

## Administrator configuration

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
The first time, the plugin needs to be installed as in the production installation.
To test client/javascript changes there is two options :
 - Use watch mode to automatically build the client files : `npm run watch` with `girder serve`
 - remove the plugin from Girder and install it again (see Installation)