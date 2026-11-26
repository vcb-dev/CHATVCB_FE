import { dropPushSubscription, pushActive, syncPushSubscription } from './push';
import { swSupported } from './pwa';
import { clearTabAlert, flashTabAlert } from './tabBadge';

const STORAGE_KEY = 'chatvcb.notify';

export function isChatVisible() {
  if (document.visibilityState !== 'visible') {
    return false;
  }
  // App Mac: khoá màn hình / rảnh lâu thì không tính là đang xem dù cửa sổ vẫn focus
  if (window.chatvcb?.isAway?.()) {
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

/** Công tắc "Thông báo tin nhắn" bật khi người dùng bật VÀ trình duyệt đã cho phép (Electron: quyền do macOS giữ) */
export function notifyGranted() {
  if (!notifyEnabled()) {
    return false;
  }
  if (window.chatvcb?.isElectron) {
    return true;
  }
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/**
 * Bật/tắt từ công tắc hoặc nút "Bật thông báo". Phải gọi thẳng trong sự kiện bấm: Safari/iOS chỉ cho xin quyền
 * trong lần chạm của người dùng (requestPermission chạy đồng bộ trước lần await đầu). Trả trạng thái sau cùng.
 */
export async function toggleNotify(on: boolean): Promise<boolean> {
  if (!on) {
    setNotifyEnabled(false);
    void dropPushSubscription();
    return false;
  }
  localStorage.setItem(STORAGE_KEY, '1');
  const status = await requestNotifyPermission();
  if (status !== 'granted') {
    return false;
  }
  void syncPushSubscription();
  return true;
}

/** Hỏi bật thông báo một lần khi trình duyệt chưa được hỏi (thay cho tự xin quyền lúc mở app, iOS chặn kiểu đó) */
const ASKED_KEY = 'chatvcb.notify.asked';

export function shouldAskNotify() {
  if (window.chatvcb?.isElectron || typeof Notification === 'undefined') {
    return false;
  }
  try {
    return (
      Notification.permission === 'default' && notifyEnabled() && localStorage.getItem(ASKED_KEY) !== '1'
    );
  } catch {
    return false;
  }
}

export function markNotifyAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    // chế độ riêng tư: lần sau hỏi lại
  }
}

async function showSystemNotification(
  title: string,
  options: NotificationOptions,
  onOpen?: () => void,
) {
  try {
    const registration = swSupported() ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration?.active) {
      // Android Chrome cấm `new Notification()`: hiện qua SW; bấm vào thì SW gửi chatvcb:open-room về trang
      await registration.showNotification(title, {
        ...options,
        icon: '/pwa-192.png',
        badge: '/pwa-badge-96.png',
      });
      return;
    }
    const toast = new Notification(title, options);
    toast.onclick = () => {
      window.focus();
      onOpen?.();
      toast.close();
    };
  } catch {
    // trình duyệt/OS chặn notification
  }
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

function showMentionBanner(title: string, subtitle: string, body: string, onOpen?: () => void) {
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
    onOpen?.();
    host.classList.remove('show');
  };
}

export function notifyIncoming(input: {
  title: string;
  body: string;
  subtitle?: string;
  mentioned?: boolean;
  tag: string;
  roomId?: string;
  onOpen?: () => void;
}) {
  if (!notifyEnabled()) {
    return;
  }
  const title = input.title.trim() || 'CHATVCB';
  const body = input.body.trim() || 'Tin nhắn mới';
  const subtitle = input.subtitle?.trim() || '';
  if (!isChatVisible()) {
    flashTabAlert(input.mentioned ? `${title} đã tag bạn` : `${title}: ${body.slice(0, 40)}`);
  }

  if (input.mentioned) {
    showMentionBanner(title, subtitle, body, input.onOpen);
  }

  if (window.chatvcb?.notify) {
    window.chatvcb.notify({
      title,
      subtitle,
      body: body.slice(0, 240),
      mentioned: Boolean(input.mentioned),
      roomId: input.roomId,
    });
    return;
  }

  // Máy này nhận Web Push: tab đã ẩn/mất focus nên BE gửi push và SW hiện thông báo, trang không báo trùng
  if (pushActive()) {
    return;
  }
  if (typeof Notification === 'undefined') {
    return;
  }
  const background = document.hidden || !document.hasFocus();
  if (!background || Notification.permission !== 'granted') {
    return;
  }
  void showSystemNotification(
    input.mentioned ? `${title} đã tag bạn` : title,
    {
      body: subtitle ? `${subtitle}\n${body}`.slice(0, 240) : body.slice(0, 240),
      tag: `chatvcb-${input.tag}`,
      silent: false,
      data: { roomId: input.roomId ?? null },
    },
    input.onOpen,
  );
}

export function restoreTitle() {
  clearTabAlert();
}
