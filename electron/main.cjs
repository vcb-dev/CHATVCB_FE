const { app, BrowserWindow, Notification, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 880,
    minHeight: 600,
    title: 'CHATVCB',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    void win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
  }
}

function senderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on('chatvcb:notify', (event, payload) => {
  const win = senderWindow(event);
  if (win?.isFocused()) {
    return;
  }
  if (!Notification.isSupported()) {
    return;
  }
  const toast = new Notification({
    title: payload?.title || 'CHATVCB',
    subtitle: payload?.subtitle || '',
    body: payload?.body || 'Tin nhắn mới',
    silent: false,
  });
  toast.on('click', () => {
    if (!win) {
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  });
  toast.show();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
