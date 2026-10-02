const STORAGE_KEY = 'chatvcb.notify';
const BASE_TITLE = 'CHATVCB';

export function notifyEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== '0';
}

export function setNotifyEnabled(on: boolean) {
  localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  if (on) {
    void requestNotifyPermission();
  }
}

export async function requestNotifyPermission() {
  if (!notifyEnabled() || typeof Notification === 'undefined') {
    return Notification?.permission ?? 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function notifyIncoming(input: {
  title: string;
  body: string;
  mentioned?: boolean;
}) {
  if (!notifyEnabled() || typeof Notification === 'undefined') {
    return;
  }
  const background = document.hidden || !document.hasFocus();
  if (!background) {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }
  document.title = input.mentioned ? 'Bạn được tag · CHATVCB' : 'Tin nhắn mới · CHATVCB';
  try {
    const toast = new Notification(input.title || 'CHATVCB', {
      body: input.body.slice(0, 140) || 'Tin nhắn mới',
      tag: 'chatvcb-message',
      silent: false,
    });
    toast.onclick = () => {
      window.focus();
      toast.close();
    };
  } catch {
    // trình duyệt/OS chặn notification
  }
}

export function restoreTitle() {
  document.title = BASE_TITLE;
}
