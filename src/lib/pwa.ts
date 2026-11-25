/// <reference types="vite-plugin-pwa/client" />
// Bản web cài như app (PWA): đăng ký Service Worker, báo có bản mới, nút "Cài đặt ứng dụng".
// Bản Electron: plugin bị tắt (vite.config.ts) nên registerSW là hàm rỗng, và swSupported() trả false.
import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type PwaState = {
  /** Đã tải bản mới, chờ người dùng bấm "Tải lại" */
  needRefresh: boolean;
  /** Trình duyệt Chromium cho cài app (đã bắt được beforeinstallprompt) */
  canInstall: boolean;
};

const UPDATE_CHECK_MS = 60 * 60 * 1000;
const UPDATE_CHECK_MIN_GAP_MS = 5 * 60 * 1000;

let state: PwaState = { needRefresh: false, canInstall: false };
const listeners = new Set<() => void>();
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

function setState(next: Partial<PwaState>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
}

/** SW chỉ chạy trên https hoặc localhost, và không chạy trong Electron (file://) */
export function swSupported() {
  return !window.chatvcb?.isElectron && 'serviceWorker' in navigator && window.isSecureContext;
}

/** Đang mở từ icon ngoài màn hình chính / app đã cài, không phải tab trình duyệt */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** App đã cài trên điện thoại/máy tính bảng: window.open(_blank) sẽ văng ra trình duyệt nên mở ngay trong app.
 *  App cài trên máy tính (Chrome/Edge) thì window.open mở được cửa sổ app mới nên vẫn mở tab như cũ. */
export function isTouchApp() {
  return isStandalone() && window.matchMedia('(pointer: coarse)').matches;
}

/** iPhone/iPad (iPad đời mới báo mình là Macintosh nhưng có màn cảm ứng) */
export function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** iPhone/iPad chưa cài app: Safari không có beforeinstallprompt, phải hướng dẫn "Chia sẻ → Thêm vào MH chính" */
export function needsIosInstallHint() {
  return isIos() && !isStandalone() && !window.chatvcb?.isElectron;
}

/** Gọi một lần lúc khởi động (main.tsx), trước khi React vẽ: beforeinstallprompt bắn rất sớm */
export function startPwa() {
  if (!swSupported()) {
    return;
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    // Giữ lại để hiện mục "Cài đặt ứng dụng" trong menu thay cho thanh gợi ý mặc định
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    setState({ canInstall: false });
  });
  applyUpdate = registerSW({
    onNeedRefresh() {
      setState({ needRefresh: true });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) {
        return;
      }
      // App cài trên điện thoại gần như không bao giờ tải lại trang: tự hỏi bản mới khi mở lại app và mỗi giờ
      let lastCheck = Date.now();
      const check = () => {
        if (document.hidden || !navigator.onLine || Date.now() - lastCheck < UPDATE_CHECK_MIN_GAP_MS) {
          return;
        }
        lastCheck = Date.now();
        void registration.update().catch(() => undefined);
      };
      window.setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', check);
    },
  });
}

export function reloadToUpdate() {
  void applyUpdate?.(true);
}

export function dismissUpdate() {
  setState({ needRefresh: false });
}

export async function installApp() {
  const event = installEvent;
  if (!event) {
    return;
  }
  installEvent = null;
  setState({ canInstall: false });
  await event.prompt();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function usePwa() {
  return useSyncExternalStore(subscribe, () => state);
}
