const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('torbot', {
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  getTorStatus: (input) => ipcRenderer.invoke('tor:status', input),
  startCrawl: (request) => ipcRenderer.invoke('crawl:start', request),
  cancelCrawl: () => ipcRenderer.invoke('crawl:cancel'),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
});
