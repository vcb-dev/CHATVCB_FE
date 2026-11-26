/// <reference lib="webworker" />
// Service Worker của bản web (PWA). vite-plugin-pwa build file này thành /sw.js và chèn danh sách precache.
// Kiểu chạy bằng tsconfig.sw.json (lib WebWorker), tách khỏi tsconfig chính (lib DOM).
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import type { PushCallAction, PushPayload } from './lib/pushPayload';
import {
  ANSWER_CALL_MESSAGE,
  ANSWER_CALL_PARAM,
  CALL_ANSWER_ACTION,
  CALL_DECLINE_ACTION,
  OPEN_ROOM_MESSAGE,
  PUSH_BADGE,
  PUSH_ICON,
} from './lib/pwaConstants';

declare const self: ServiceWorkerGlobalScope;

// tsconfig.sw.json không nạp vite/client; Vite vẫn thay import.meta.env lúc build SW
declare global {
  interface ImportMeta {
    readonly env: { readonly VITE_APP_URL?: string };
  }
}

/** Giống API_URL của app (src/api/session.ts): prod là /api cùng origin (rewrite Vercel), local là BE tuyệt đối */
const API_URL = (import.meta.env.VITE_APP_URL ?? '/api').replace(/\/$/, '');

// lib WebWorker của TS chưa có `actions` / `renotify` (chỉ Chromium + Firefox hỗ trợ; Safari/iOS bỏ qua)
type FullNotificationOptions = NotificationOptions & {
  renotify?: boolean;
  actions?: { action: string; title: string }[];
};

type NotificationData = { roomId?: string | null; call?: PushCallAction | null } | null;

// Chỉ vỏ app (JS/CSS/HTML/font/icon); dữ liệu luôn lấy từ mạng
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Mọi trang của app là index.html, trừ /api: đăng nhập Google (/api/auth/google/start),
// kết nối Gmail/Facebook/Drive… là chuyển hẳn trang tới BE qua rewrite của Vercel, trả index.html là hỏng đăng nhập.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api(\/|$)/],
  }),
);

// Nút "Tải lại" của thông báo có bản mới (workbox-window gửi khi người dùng đồng ý)
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

type BadgeNavigator = WorkerNavigator & { setAppBadge?: (count?: number) => Promise<void> };

function readPayload(event: PushEvent): PushPayload {
  try {
    return (event.data?.json() as PushPayload | undefined) ?? { title: '', body: '' };
  } catch {
    return { title: '', body: event.data?.text() ?? '' };
  }
}

// Push luôn phải hiện thông báo (userVisibleOnly): iOS thu hồi đăng ký nếu push mà không hiện gì.
// Việc "đang xem thì không báo" do BE quyết trước khi gửi.
self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const silent = Boolean(data.silent);
  const options: FullNotificationOptions = {
    body: data.body || 'Tin nhắn mới',
    tag: data.tag || 'chatvcb',
    // Cùng tag (cùng phòng / cùng cuộc gọi) thì thay thông báo cũ nhưng vẫn rung lại; thông báo lặng lẽ thì không
    renotify: !silent,
    silent,
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
    requireInteraction: Boolean(data.requireInteraction),
    data: { roomId: data.roomId ?? null, call: data.call ?? null } satisfies NotificationData,
    actions: data.call
      ? [
          { action: CALL_ANSWER_ACTION, title: 'Nghe' },
          { action: CALL_DECLINE_ACTION, title: 'Từ chối' },
        ]
      : undefined,
  };
  const nav = self.navigator as BadgeNavigator;
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'CHATVCB', options),
      // Không có số chính xác ở đây: chấm trên icon; mở app thì tabBadge đặt lại đúng số
      silent ? undefined : nav.setAppBadge?.().catch(() => undefined),
    ]),
  );
});

/** "Từ chối" mà không mở app: gửi lại mã BE đã ký. Không kèm cookie nên CSRF không chặn, quyền nằm ở mã. */
async function declineCall(call: PushCallAction) {
  try {
    await fetch(`${API_URL}/push/call-reject`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: call.id, userId: call.userId, exp: call.exp, sig: call.sig }),
    });
  } catch {
    // Mất mạng: chuông bên kia tự hết sau 35 giây
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as NotificationData;
  const roomId = data?.roomId ?? '';
  const call = data?.call ?? null;
  if (call && event.action === CALL_DECLINE_ACTION) {
    event.waitUntil(declineCall(call));
    return;
  }
  const answerId = call && event.action === CALL_ANSWER_ACTION ? call.id : '';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (roomId) {
          open.postMessage({ type: OPEN_ROOM_MESSAGE, roomId });
        }
        if (answerId) {
          open.postMessage({ type: ANSWER_CALL_MESSAGE, callId: answerId });
        }
        return;
      }
      // App đã đóng: mở lại với ?room= để ChatPage mở đúng hội thoại sau khi tải danh sách phòng,
      // thêm ?answer= thì useChatCall tự nghe máy khi BE gửi lại tín hiệu đổ chuông
      const params = new URLSearchParams();
      if (roomId) {
        params.set('room', roomId);
      }
      if (answerId) {
        params.set(ANSWER_CALL_PARAM, answerId);
      }
      const search = params.toString();
      await self.clients.openWindow(search ? `/?${search}` : '/');
    })(),
  );
});
