const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { getVersion: () => ipcRenderer.invoke('get-version') });
