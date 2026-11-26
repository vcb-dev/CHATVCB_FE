const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatvcb', {
  isElectron: true,
  notify(payload) {
    ipcRenderer.send('chatvcb:notify', payload);
  },
  isWindowFocused() {
    return ipcRenderer.sendSync('chatvcb:focused');
  },
  isAway() {
    return ipcRenderer.sendSync('chatvcb:away');
  },
  onAwayChange(handler) {
    const listener = (_event, away) => handler(Boolean(away));
    ipcRenderer.on('chatvcb:away-changed', listener);
    return () => ipcRenderer.removeListener('chatvcb:away-changed', listener);
  },
  setBadge(count) {
    ipcRenderer.send('chatvcb:badge', count);
  },
  callAlert(on) {
    ipcRenderer.send('chatvcb:call-alert', Boolean(on));
  },
  onOpenRoom(handler) {
    const listener = (_event, roomId) => handler(roomId);
    ipcRenderer.on('chatvcb:open-room', listener);
    return () => ipcRenderer.removeListener('chatvcb:open-room', listener);
  },
});
