const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  search: (keyword, options) => ipcRenderer.invoke('search', keyword, options),
  list: () => ipcRenderer.invoke('list'),
  install: (repo, skillName, scope) => ipcRenderer.invoke('install', repo, skillName, scope),
  remove: (name) => ipcRenderer.invoke('remove', name),
  doctor: () => ipcRenderer.invoke('doctor'),
  env: () => ipcRenderer.invoke('env'),
  info: (name) => ipcRenderer.invoke('info', name),
  diff: (name) => ipcRenderer.invoke('diff', name),
  update: (name) => ipcRenderer.invoke('update', name),
});
