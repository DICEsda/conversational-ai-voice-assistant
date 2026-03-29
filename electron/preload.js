const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Secure bridge between main and renderer processes
 * Exposes limited API to the frontend via window.electronAPI
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend control
  backend: {
    start: () => ipcRenderer.invoke('backend:start'),
    stop: () => ipcRenderer.invoke('backend:stop'),
    getStatus: () => ipcRenderer.invoke('backend:status'),
    getUrl: () => ipcRenderer.invoke('backend:url'),
    onStatusChange: (callback) => {
      ipcRenderer.on('backend-status', (event, status) => callback(status));
      // Return unsubscribe function
      return () => ipcRenderer.removeListener('backend-status', callback);
    },
  },

  // Window control
  window: {
    resize: (width, height) => ipcRenderer.send('window:resize', { width, height }),
    setMinSize: (width, height) => ipcRenderer.send('window:set-min-size', { width, height }),
  },

  // System info
  platform: process.platform,
  isElectron: true,
});

console.log('Preload script loaded');
