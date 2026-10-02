const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('chatvcb', {
  isElectron: true,
});
