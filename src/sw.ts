/// <reference lib="webworker" />
// Service Worker của bản web (PWA). vite-plugin-pwa build file này thành /sw.js và chèn danh sách precache.
// Kiểu chạy bằng tsconfig.sw.json (lib WebWorker), tách khỏi tsconfig chính (lib DOM).
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { OPEN_ROOM_MESSAGE, type PushPayload } from './lib/pushPayload';

declare const self: ServiceWorkerGlobalScope;

const ICON = '/pwa-192.png';
// Android vẽ icon nhỏ trên thanh trạng thái bằng kênh alpha: ảnh trắng nền trong suốt
const BADGE = '/pwa-badge-96.png';

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
  const options: NotificationOptions & { renotify?: boolean } = {
    body: data.body || 'Tin nhắn mới',
    tag: data.tag || 'chatvcb',
    // Cùng tag (cùng phòng / cùng cuộc gọi) thì thay thông báo cũ nhưng vẫn rung lại
    renotify: true,
    icon: ICON,
    badge: BADGE,
    requireInteraction: Boolean(data.requireInteraction),
    data: { roomId: data.roomId ?? null },
  };
  const nav = self.navigator as BadgeNavigator;
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'CHATVCB', options),
      // Không có số chính xác ở đây: chấm trên icon; mở app thì tabBadge đặt lại đúng số
      nav.setAppBadge?.().catch(() => undefined),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomId = (event.notification.data as { roomId?: string | null } | null)?.roomId ?? '';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (roomId) {
          open.postMessage({ type: OPEN_ROOM_MESSAGE, roomId });
        }
        return;
      }
      // App đã đóng: mở lại với ?room= để ChatPage mở đúng hội thoại sau khi tải danh sách phòng
      await self.clients.openWindow(roomId ? `/?room=${encodeURIComponent(roomId)}` : '/');
    })(),
  );
});
