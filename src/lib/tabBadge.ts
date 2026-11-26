// Tab trình duyệt giống Messenger: tiêu đề "(3) CHATVCB" + chấm đỏ trên favicon đếm số cuộc
// trò chuyện chưa đọc; tin mới đến lúc đang ở tab khác thì tiêu đề nhấp nháy tên người gửi.
// Bản Electron không có tab nên số này lên badge ở Dock; bản web cài như app (PWA) lên badge trên icon app.
const BASE_TITLE = 'CHATVCB';
// base './' ở bản Electron: đường dẫn tuyệt đối "/favicon.png" sẽ trỏ ra gốc ổ đĩa
const ICON_URL = `${import.meta.env.BASE_URL}favicon.png`;
const FLASH_MS = 1500;
const ICON_SIZE = 64;
const BADGE_COLOR = '#f02849';

// -1: lần gọi đầu (kể cả 0) luôn chạy, để xóa chấm mà Service Worker gắn lên icon app lúc app đóng
let unread = -1;
let alertText: string | null = null;
let alertShown = false;
let flashTimer = 0;
let iconLoad: Promise<HTMLImageElement> | null = null;

function countLabel(count: number, max: number) {
  return count > max ? `${max}+` : String(count);
}

function renderTitle() {
  const base = unread > 0 ? `(${countLabel(unread, 99)}) ${BASE_TITLE}` : BASE_TITLE;
  document.title = alertText && alertShown ? alertText : base;
}

function iconLink() {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function loadIcon() {
  iconLoad ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      iconLoad = null;
      reject(new Error('favicon'));
    };
    img.src = ICON_URL;
  });
  return iconLoad;
}

async function renderIcon(count: number) {
  if (count <= 0) {
    iconLink().href = ICON_URL;
    return;
  }
  const img = await loadIcon();
  // Số đã đổi trong lúc chờ tải ảnh thì lần gọi sau sẽ vẽ
  if (count !== unread) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
  // Chấm đỏ góc trên phải, viền trắng để tách khỏi logo; ở cỡ 16px vẫn đọc được một chữ số
  const label = countLabel(count, 9);
  const r = 22;
  const cx = ICON_SIZE - r;
  const cy = r;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_COLOR;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${label.length > 1 ? 24 : 32}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 2);
  iconLink().href = canvas.toDataURL('image/png');
}

/** Số cuộc trò chuyện chưa đọc: hiện trên tiêu đề, favicon và Dock (Electron). */
export function setTabUnread(count: number) {
  const next = Math.max(0, Math.floor(count));
  if (next === unread) {
    return;
  }
  unread = next;
  renderTitle();
  void renderIcon(next).catch(() => undefined);
  if (window.chatvcb?.setBadge) {
    window.chatvcb.setBadge(next);
  } else {
    setAppBadge(next);
  }
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Số trên icon app đã cài (PWA: Chrome/Edge, Android, iOS 16.4+); trình duyệt không hỗ trợ thì bỏ qua */
function setAppBadge(count: number) {
  const nav = navigator as BadgeNavigator;
  try {
    const pending = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
    void pending?.catch(() => undefined);
  } catch {
    // Chưa cấp quyền thông báo (iOS) hoặc không phải app đã cài
  }
}

/** Nhấp nháy tiêu đề giữa `text` và "(n) CHATVCB" cho tới khi người dùng quay lại tab. */
export function flashTabAlert(text: string) {
  alertText = text;
  alertShown = true;
  renderTitle();
  if (!flashTimer) {
    flashTimer = window.setInterval(() => {
      alertShown = !alertShown;
      renderTitle();
    }, FLASH_MS);
  }
}

export function clearTabAlert() {
  window.clearInterval(flashTimer);
  flashTimer = 0;
  alertText = null;
  alertShown = false;
  renderTitle();
}

/** Đăng xuất: trả tab về mặc định. */
export function resetTab() {
  setTabUnread(0);
  clearTabAlert();
}
