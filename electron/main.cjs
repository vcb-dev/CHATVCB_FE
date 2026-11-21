const { app, BrowserWindow, Notification, ipcMain, nativeTheme, shell, screen } = require('electron');
const path = require('path');

let mentionWin = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mentionToastHtml(title, subtitle, body) {
  const highlighted = escapeHtml(body).replace(
    /(@[A-Za-z0-9._-]+)/g,
    '<span class="mention">$1</span>',
  );
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    .card{font-family:system-ui,sans-serif;background:#1d1d1f;color:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 10px 28px rgba(0,0,0,.35);cursor:pointer}
    .who{font-weight:700;font-size:13px}
    .room{color:#b0b0b0;font-size:12px;margin-top:2px}
    .body{margin-top:6px;font-size:13px;line-height:1.4;word-break:break-word}
    .mention{color:#3b9eff;font-weight:700}
  </style></head><body>
    <div class="card" id="card">
      <div class="who">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="room">${escapeHtml(subtitle)}</div>` : ''}
      <div class="body">${highlighted}</div>
    </div>
  </body></html>`;
}

function openRoom(win, roomId) {
  if (!win || win.isDestroyed() || !roomId) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
  win.webContents.send('chatvcb:open-room', roomId);
}

function showMentionToast(payload, mainWin) {
  if (mentionWin && !mentionWin.isDestroyed()) {
    mentionWin.close();
  }
  const area = screen.getPrimaryDisplay().workArea;
  mentionWin = new BrowserWindow({
    width: 360,
    height: 120,
    x: area.x + area.width - 380,
    y: area.y + 18,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
  });
  mentionWin.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      mentionToastHtml(payload?.title || 'CHATVCB', payload?.subtitle || '', payload?.body || 'Tin nhắn mới'),
    )}`,
  );
  mentionWin.once('ready-to-show', () => mentionWin.showInactive());
  mentionWin.on('focus', () => {
    openRoom(mainWin, payload?.roomId);
    if (mentionWin && !mentionWin.isDestroyed()) {
      mentionWin.close();
    }
  });
  setTimeout(() => {
    if (mentionWin && !mentionWin.isDestroyed()) {
      mentionWin.close();
    }
  }, 6000);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 880,
    minHeight: 600,
    title: 'CHATVCB',
    // Nền lúc trang chưa tải: theo sáng/tối của hệ điều hành để không nháy trắng
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18191a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (String(url).includes('#/meet') || String(url).includes('#/sheet')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280,
          height: 840,
          minWidth: 880,
          minHeight: 600,
          title: String(url).includes('#/sheet') ? 'Bảng tính · CHATVCB' : 'Cuộc họp · CHATVCB',
          backgroundColor: nativeTheme.shouldUseDarkColors ? '#18191a' : '#f1f3f4',
        },
      };
    }
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

ipcMain.on('chatvcb:focused', (event) => {
  event.returnValue = Boolean(senderWindow(event)?.isFocused());
});

// Số cuộc trò chuyện chưa đọc lên icon Dock (macOS) như Messenger
ipcMain.on('chatvcb:badge', (_event, count) => {
  app.setBadgeCount(Math.max(0, Math.floor(Number(count)) || 0));
});

// Cuộc gọi đến lúc app chạy nền: nảy icon Dock (macOS) / nháy thanh tác vụ (Windows) tới khi bắt máy, từ chối hoặc hết chuông
let callBounceId = null;

function stopCallAlert(win) {
  if (callBounceId !== null) {
    app.dock?.cancelBounce(callBounceId);
    callBounceId = null;
  }
  win?.flashFrame(false);
}

ipcMain.on('chatvcb:call-alert', (event, on) => {
  const win = senderWindow(event);
  stopCallAlert(win);
  if (!on || win?.isFocused()) {
    return;
  }
  if (process.platform === 'darwin') {
    callBounceId = app.dock?.bounce('critical') ?? null;
  } else {
    win?.flashFrame(true);
  }
});

ipcMain.on('chatvcb:notify', (event, payload) => {
  const win = senderWindow(event);
  if (win?.isFocused()) {
    return;
  }
  if (payload?.mentioned) {
    showMentionToast(payload, win);
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
    openRoom(win, payload?.roomId);
  });
  toast.show();
});

// Windows chỉ hiện thông báo khi app có AppUserModelId khớp shortcut (bản cài: appId của electron-builder)
if (process.platform === 'win32') {
  app.setAppUserModelId(app.isPackaged ? 'vn.chatvcb.desktop' : process.execPath);
}

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
