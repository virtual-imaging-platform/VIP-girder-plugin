// Import utilities
import { wrap } from '@girder/core/utilities/PluginUtils';
import { formatSize } from "@girder/core/misc";
import FolderModel from '@girder/core/models/FolderModel'

// Import views
import UploadWidget from "@girder/core/views/widgets/UploadWidget";

// Import templates
import UploadFolderCheckboxTemplate from '../templates/uploadFolderCheckbox.pug';
import {fetchGirderFolders} from "../utilities/vipPluginUtils";

wrap(UploadWidget, 'render', function (render) {
    render.call(this);
    this.folderSelection = false;
    this.$('.modal-footer').prepend(UploadFolderCheckboxTemplate());
    this.$('.upload-folder-checkbox').on('change', this.toggleFolderSelection.bind(this));
    this.dropZoneBlocker = (e) => {
        if (this.folderSelection) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    };
});

UploadWidget.prototype.toggleFolderSelection = function() {
    this.folderSelection = this.$('.upload-folder-checkbox').is(':checked');
    this.files = [];
    this.filesChanged();
    if (this.folderSelection) {
        // Add directory browsing option
        this.$('#g-files').attr('webkitdirectory', '');
        this.$('.g-drop-zone')
            .html(`<i class="icon-docs"/> Browse folders here`);
        this.$('.modal-title').html('Upload folder');
        // Remove drag&drop option for folders
        this.$('.g-drop-zone').on('dragenter dragover dragleave drop', this.dropZoneBlocker);
    } else {
        this.$('#g-files').removeAttr('webkitdirectory');
        this.$('.g-drop-zone')
            .html(`<i class="icon-docs"/> ${this._browseText}`);
        this.$('.modal-title').html(this.title);
        this.$('.g-drop-zone').off('dragenter dragover dragleave drop', this.dropZoneBlocker);
    }
}

wrap(UploadWidget, 'filesChanged', function(filesChanged)  {
    filesChanged.call(this);
    if (!this.folderSelection) {
        return;
    }

    if (this.files.length === 0) {
        this.$('.g-overall-progress-message').text('No folder selected');
        return;
    }

    let msg = 'Selected <b>' + this.files[0].webkitRelativePath.split('/')[0] +
            '</b> folder, <b>' + this.files.length + '</b>' + ((this.files.length === 1) ? ' file' : ' files');

    this.$('.g-overall-progress-message').html('<i class="icon-ok"/> ' +
        msg + '  (' + formatSize(this.totalSize) +
        ') -- Press start upload button');
});

wrap(UploadWidget, 'startUpload', function(startUpload)  {
    this.folderCache = null;
    startUpload.call(this);
});

wrap(UploadWidget, 'uploadNextFile', function (uploadNextFile, fileUpload = false) {
    if (this.currentIndex >= this.files.length || fileUpload) {
        uploadNextFile.call(this);
        return;
    }

    const file = this.files[this.currentIndex];
    const relativePath = file.webkitRelativePath;
    if (this.parentType === 'folder' && relativePath) {
        this.parsePath(file, relativePath);
        return;
    }

    uploadNextFile.call(this);
});

UploadWidget.prototype.parsePath = function (file, relativePath) {
    const pathParts = relativePath.split('/');
    pathParts.pop();
    // If the folder cache exists, directly reach into folder structure
    if (this.folderCache) {
        this.buildPathRecursive(this.parent, pathParts);
        return;
    }

    // Else create folder cache first
    this.buildFolderCache(this.parent)
        .then(() => {
            this.buildPathRecursive(this.parent, pathParts);
        });
};

UploadWidget.prototype.buildPathRecursive = function (parent, parts, index = 0) {
    // Path created or reached : upload file
    if (index >= parts.length) {
        const originalParent = this.parent;
        this.parent = parent;
        this.uploadNextFile(true);
        this.parent = originalParent;
        return;
    }

    const folderName = parts[index];
    const cacheKey = parent.id + '/' + folderName;
    // If the folder is cached, reach for next folder step
    if (this.folderCache[cacheKey]) {
        this.buildPathRecursive(this.folderCache[cacheKey], parts, index + 1);
        return;
    }

    // Else create a new folder first
    this.createFolder(parent, folderName)
        .then(folder => {
            this.buildPathRecursive(folder, parts, index + 1);
        });
};

UploadWidget.prototype.buildFolderCache = function (parent) {
    this.folderCache = {};
    // Fill folder cache with fetchGirderFolders content (see vipPluginsUtils.js)
    const fillCacheRecursive = (folder) => {
        const cacheKey = folder.model.get("parentId") + '/' + folder.model.get("name");
        this.folderCache[cacheKey] = folder.model;
        _.each(folder.children, child => {
            fillCacheRecursive(child);
        });
    };

    return fetchGirderFolders(parent).then(fillCacheRecursive);
}

UploadWidget.prototype.createFolder = function (parent, folderName) {
    return new Promise((resolve, reject) => {
        const folder = new FolderModel({
            name: folderName,
            parentId: parent.id,
            parentType: 'folder'
        });

        folder.on('g:saved', () => {
            const cacheKey = parent.id + '/' + folderName;
            this.folderCache[cacheKey] = folder;
            resolve(folder);
        }).on('g:error', (err) => {
            console.error('Error creating folder:', err);
            reject(err);
        });

        folder.save();
    });
};