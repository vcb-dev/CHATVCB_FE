// Web Push: nhận thông báo tin nhắn / cuộc gọi khi đã đóng app hoặc khoá màn hình.
// Socket gửi endpoint của máy này kèm `client.active` (useChatSocket): BE bỏ đúng máy đang được xem,
// các máy khác của cùng người vẫn nhận. Máy đã đăng ký push thì thông báo hệ thống do Service Worker hiện,
// trang không tự báo nữa.
import { api } from '@/api/client';
import { swSupported } from './pwa';
import { PUSH_READY_TIMEOUT_MS } from './pwaConstants';

let endpoint: string | null = null;
const endpointListeners = new Set<() => void>();

function setEndpoint(next: string | null) {
  if (next === endpoint) {
    return;
  }
  endpoint = next;
  endpointListeners.forEach((listener) => listener());
}

/** Máy này đang nhận Web Push (đăng ký xong và BE đã lưu) */
export function pushActive() {
  return endpoint !== null;
}

/** Endpoint push của máy này (null khi chưa đăng ký): socket báo BE để không đẩy trùng vào máy đang xem */
export function pushEndpoint() {
  return endpoint;
}

/** Endpoint đổi (đăng ký xong, gia hạn, tắt thông báo): socket báo lại BE ngay */
export function onPushEndpointChange(listener: () => void) {
  endpointListeners.add(listener);
  return () => {
    endpointListeners.delete(listener);
  };
}

/** Trình duyệt có Push API. iPhone chỉ có khi đã "Thêm vào MH chính" (iOS 16.4+) */
export function pushSupported() {
  return swSupported() && 'PushManager' in window && typeof Notification !== 'undefined';
}

function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function sameKey(subscription: PushSubscription, key: Uint8Array) {
  const current = subscription.options.applicationServerKey;
  if (!current) {
    return false;
  }
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((value, i) => value === key[i]);
}

async function registration() {
  if (!(await navigator.serviceWorker.getRegistration())) {
    return null;
  }
  // ready chỉ xong khi SW đã active; lần đầu cài có thể mất vài giây
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), PUSH_READY_TIMEOUT_MS)),
  ]);
}

/**
 * Đăng ký (hoặc gia hạn) Web Push cho máy này rồi gửi lên BE. Không xin quyền:
 * chỉ chạy khi đã được cấp, nên gọi được lúc vào app và ngay sau khi người dùng bật thông báo.
 */
export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== 'granted') {
    setEndpoint(null);
    return;
  }
  try {
    const { publicKey } = await api.pushVapidKey();
    const reg = publicKey ? await registration() : null;
    if (!publicKey || !reg) {
      setEndpoint(null);
      return;
    }
    const key = keyBytes(publicKey);
    let subscription = await reg.pushManager.getSubscription();
    if (subscription && !sameKey(subscription, key)) {
      // BE đổi cặp khóa VAPID: đăng ký cũ không nhận được push nữa
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    await api.pushSubscribe(subscription.toJSON());
    setEndpoint(subscription.endpoint);
  } catch {
    setEndpoint(null);
  }
}

/** Tắt thông báo hoặc đăng xuất: gỡ khỏi BE trước (cần phiên còn sống) để người sau dùng máy không nhận tin của mình. */
export async function dropPushSubscription() {
  setEndpoint(null);
  if (!pushSupported()) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) {
      return;
    }
    await api.pushUnsubscribe(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Trình duyệt từ chối huỷ: BE vẫn tự dọn khi dịch vụ push trả 404/410
  }
}
