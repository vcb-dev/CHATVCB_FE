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
  if (!notifyEnabled()) {
    return 'denied';
  }
  if (window.chatvcb?.isElectron) {
    return 'granted';
  }
  if (typeof Notification === 'undefined') {
    return 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function notifyIncoming(input: {
  title: string;
  body: string;
  subtitle?: string;
  mentioned?: boolean;
}) {
  if (!notifyEnabled()) {
    return;
  }
  const title = input.title.trim() || 'CHATVCB';
  const body = input.body.trim() || 'Tin nhắn mới';
  const subtitle = input.subtitle?.trim() || '';
  document.title = input.mentioned ? `${title} đã tag bạn` : `${title}: ${body.slice(0, 40)}`;

  if (window.chatvcb?.notify) {
    window.chatvcb.notify({ title, subtitle, body: body.slice(0, 240) });
    return;
  }

  if (typeof Notification === 'undefined') {
    return;
  }
  const background = document.hidden || !document.hasFocus();
  if (!background || Notification.permission !== 'granted') {
    return;
  }
  try {
    const toast = new Notification(title, {
      body: subtitle ? `${subtitle}\n${body}`.slice(0, 240) : body.slice(0, 240),
      tag: `chatvcb-${Date.now()}`,
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
