const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatvcb', {
  isElectron: true,
  notify(payload) {
    ipcRenderer.send('chatvcb:notify', payload);
  },
});
