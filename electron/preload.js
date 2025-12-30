const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  getYtDlpPath: () => ipcRenderer.invoke('get-ytdlp-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  platform: process.platform,
  isElectron: true
});

