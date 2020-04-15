// Import utilities
import router from '@girder/core/router';
import events from '@girder/core/events';
import { hasTheVipApiKeyConfigured, messageGirder } from './utilities/vipPluginUtils';

// Import Views
import MyExecutions from './views/MyExecutions';
import ItemView from '@girder/core/views/body/ItemView';
import FolderView from '@girder/core/views/body/FolderView';
import CollectionView from '@girder/core/views/body/CollectionView';

// add route to open launch popups
router.route('item/:id/file/:id', 'item-file-vip-pipelines', function (itemId, fileId, params) {
    if (params.dialog === 'vip-pipelines') {
        ItemView.fetchAndInit(itemId, {
            showVipPipelines: true,
            vipPipelineFileId: fileId
        });
    } else if (params.dialog === 'vip-launch' && params.dialogid) {
        ItemView.fetchAndInit(itemId, {
            showVipLaunch: true,
            vipPipelineId: params.dialogid,
            vipPipelineFileId: fileId
        });
    } else {
        messageGirder("warning", 'Missing vip-pipelines parameter to launch a VIP pipeline');
        router.navigate('/item/' + itemId, {trigger: true});
    }
});

router.route('collection/:id/folder/:id/item/:id/file/:id',
        'collection-folder-vip-pipelines',
        function (cid, folderId, itemId, fileId, params) {
    if (params.dialog === 'vip-pipelines') {
        CollectionView.fetchAndInit(cid, {
            folderId: folderId,
            showVipPipelines: true,
            vipPipelineItemId: itemId,
            vipPipelineFileId: fileId
        });
    } else if (params.dialog === 'vip-launch' && params.dialogid) {
        CollectionView.fetchAndInit(cid, {
            folderId: folderId,
            showVipLaunch: true,
            vipPipelineItemId: itemId,
            vipPipelineFileId: fileId,
            vipPipelineId: params.dialogid
        });
    } else {
        messageGirder("warning", 'Missing vip-pipelines parameter to launch a VIP pipeline');
        router.navigate('/collection/' + cid + '/folder/' + folderId, {trigger: true});
    }
});

router.route('folder/:id/item/:id/file/:id',
        'folder-vip-pipelines',
        function (folderId, itemId, fileId, params) {
    if (params.dialog === 'vip-pipelines') {
        FolderView.fetchAndInit(folderId, {
            showVipPipelines: true,
            vipPipelineItemId: itemId,
            vipPipelineFileId: fileId
        });
    } else if (params.dialog === 'vip-launch' && params.dialogid) {
        FolderView.fetchAndInit(folderId, {
            showVipLaunch: true,
            vipPipelineItemId: itemId,
            vipPipelineFileId: fileId,
            vipPipelineId: params.dialogid
        });
    } else {
        messageGirder("warning", 'Missing vip-pipelines parameter to launch a VIP pipeline');
        router.navigate('/folder/' + folderId, {trigger: true});
    }
});

// New route #my-executions
router.route('my-executions', 'myexecutions', function() {
   events.trigger('g:navigateTo', MyExecutions);
})
