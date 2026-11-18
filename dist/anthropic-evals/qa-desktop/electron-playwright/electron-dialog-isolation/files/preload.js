const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { importCsv: () => ipcRenderer.invoke('import-csv') });
