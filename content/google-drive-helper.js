// google-drive-helper.js

window.GoogleDriveHelper = class {
    /**
     * @param {string} accessToken - Google OAuth access token.
     * @param {string} fileName - Default file name for the JSON file.
     */
    constructor(accessToken, fileName = 'chatgpt-scenarios.json') {
        this.token = accessToken;
        this.fileName = fileName;
        this.lastFileId = null;  // save last used file id (optional)
    }



    /**
     * Uploads JSON to Google Drive (create new or update existing file).
     * @param {object} jsonObj - The JSON object to upload.
     * @param {string|null} existingFileId - Optional file ID to update.
     * @returns {Promise<object>} - Google Drive file metadata.
     */
    async uploadJson(jsonObj, existingFileId = null) {
        const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json' });
        const form = new FormData();
        const metadata = {
            name: this.fileName,
            mimeType: 'application/json'
        };

// 🟢 Chỉ gán parents khi TẠO MỚI file (POST)
        if (!existingFileId && this.folderId) {
            metadata.parents = [this.folderId];
        }

        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        let url;
        if (existingFileId) {
            // Nếu đang UPDATE và có folderId ➔ thêm addParents vào URL
            const addParents = this.folderId ? `&addParents=${this.folderId}` : '';
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart${addParents}`;
        } else {
            url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        }

        const res = await fetch(url, {
            method: existingFileId ? 'PATCH' : 'POST',
            headers: { 'Authorization': 'Bearer ' + this.token },
            body: form
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('Upload failed:', data);
            throw new Error(data.error?.message || 'Upload failed');
        }

        this.lastFileId = data.id;
        return data;
    }

    /**
     * Downloads JSON from Google Drive using file ID.
     * @param {string} fileId - The Google Drive file ID.
     * @returns {Promise<object>} - The JSON content.
     */
    async downloadJson(fileId) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + this.token }
        });
        if (!res.ok) {
            console.error('Download failed:', await res.text());
            throw new Error('Failed to download JSON');
        }
        return await res.json();
    }

    /**
     * Searches for a file on Google Drive by name.
     * @param {string|null} name - The file name to search for (default: this.fileName).
     * @returns {Promise<object|null>} - File metadata or null if not found.
     */
    async findFileByName(name = null) {
        const query = encodeURIComponent(`name='${name || this.fileName}' and trashed=false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.token }
        });
        if (!res.ok) {
            console.error('Search failed:', await res.text());
            throw new Error('Failed to search file');
        }
        const data = await res.json();
        const file = data.files?.[0] || null;
        if (file) this.lastFileId = file.id;
        return file;
    }

    /**
     * Deletes a file by its file ID.
     * @param {string} fileId - The Google Drive file ID.
     * @returns {Promise<void>}
     */
    async deleteFile(fileId) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + this.token }
        });
        if (!res.ok) {
            console.error('Delete failed:', await res.text());
            throw new Error('Failed to delete file');
        }
        console.log(`✅ Deleted file: ${fileId}`);
    }

    /**
     * Tìm hoặc tạo thư mục Google Drive.
     * @param {string} folderName - Tên thư mục (ví dụ: "_chatgptContentHelper").
     * @returns {Promise<string>} - Trả về fileId của thư mục.
     */
    async getOrCreateFolder(folderName) {
        const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + this.token }
        });
        const data = await res.json();
        if (res.ok && data.files && data.files.length > 0) {
            console.log(`📁 Found folder '${folderName}':`, data.files[0]);
            return data.files[0].id;
        }

        // Chưa có ➔ tạo mới
        console.log(`📁 Folder '${folderName}' not found. Creating...`);
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + this.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error('Failed to create folder');
        console.log(`✅ Created folder '${folderName}':`, createData);
        return createData.id;
    }

}
