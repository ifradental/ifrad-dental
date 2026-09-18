const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printDirect: (options) => ipcRenderer.invoke('print-direct', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isDesktop: true,
});

