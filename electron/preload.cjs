const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatvcb', {
  isElectron: true,
  notify(payload) {
    ipcRenderer.send('chatvcb:notify', payload);
  },
  isWindowFocused() {
    return ipcRenderer.sendSync('chatvcb:focused');
  },
  onOpenRoom(handler) {
    const listener = (_event, roomId) => handler(roomId);
    ipcRenderer.on('chatvcb:open-room', listener);
    return () => ipcRenderer.removeListener('chatvcb:open-room', listener);
  },
});
