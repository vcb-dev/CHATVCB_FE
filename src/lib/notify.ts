const STORAGE_KEY = 'chatvcb.notify';
const BASE_TITLE = 'CHATVCB';

export function isChatVisible() {
  if (document.visibilityState !== 'visible') {
    return false;
  }
  if (window.chatvcb?.isWindowFocused) {
    return window.chatvcb.isWindowFocused();
  }
  return document.hasFocus();
}

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mentionHtml(text: string) {
  return escapeHtml(text).replace(
    /(@[A-Za-z0-9._-]+)/g,
    '<span class="mention">$1</span>',
  );
}

function showMentionBanner(title: string, subtitle: string, body: string) {
  let host = document.getElementById('chatvcb-mention-toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'chatvcb-mention-toast';
    document.body.appendChild(host);
  }
  host.innerHTML = `<strong>${escapeHtml(title)}${subtitle ? ` · ${escapeHtml(subtitle)}` : ''}</strong><p>${mentionHtml(body)}</p>`;
  host.classList.add('show');
  window.clearTimeout(Number(host.dataset.timer));
  host.dataset.timer = String(
    window.setTimeout(() => host.classList.remove('show'), 5000),
  );
  host.onclick = () => {
    window.focus();
    host.classList.remove('show');
  };
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

  if (input.mentioned) {
    showMentionBanner(title, subtitle, body);
  }

  if (window.chatvcb?.notify) {
    window.chatvcb.notify({
      title,
      subtitle,
      body: body.slice(0, 240),
      mentioned: Boolean(input.mentioned),
    });
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
    const toast = new Notification(input.mentioned ? `${title} đã tag bạn` : title, {
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
