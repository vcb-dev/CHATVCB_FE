import type { QueryClient } from '@tanstack/react-query';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessage } from '@/types';
import {
  isTemp,
  mergeLatest,
  receiveMessage,
  reconcileTemps,
  settleTemp,
  type MessagesCache,
} from './messageCache';
import { dropEntry, entriesIn } from './outbox';

/** Cache tin của phòng không còn ai xem được giữ 30 phút rồi tự xóa. */
export const MESSAGES_GC_MS = 30 * 60_000;
const IMAGE_SWAP_WAIT_MS = 3000;

// Tin socket tới phòng đang mở trong lúc phòng chưa có cache (lần mở đầu còn đang tải)
const early = new Map<string, ChatMessage[]>();

export function getMessages(queryClient: QueryClient, roomId: string) {
  return queryClient.getQueryData<MessagesCache>(queryKeys.messages(roomId));
}

/** Sửa cache tin của một phòng; phòng chưa có cache thì bỏ qua. */
export function updateMessages(
  queryClient: QueryClient,
  roomId: string,
  update: (cache: MessagesCache) => MessagesCache,
) {
  queryClient.setQueryData<MessagesCache>(queryKeys.messages(roomId), (old) =>
    old ? update(old) : old,
  );
}

/**
 * queryFn của tin: tải trang mới nhất rồi trộn với cache đọc lúc response về (tin socket, tin tạm chèn trong lúc tải),
 * rồi đối chiếu hộp thư đi: tin đã tới nơi thì bỏ khỏi hộp thư, tin chưa gửi được (kể cả từ trước F5) thì hiện lại.
 */
export async function loadLatest(queryClient: QueryClient, roomId: string): Promise<MessagesCache> {
  const page = await api.messages(roomId);
  const buffered = early.get(roomId) ?? [];
  early.delete(roomId);
  const merged = mergeLatest(getMessages(queryClient, roomId), page, buffered);
  const { cache, sent } = reconcileTemps(merged, entriesIn(roomId).map((entry) => entry.temp));
  for (const clientId of sent) {
    releaseBlobs(clientId);
    dropEntry(clientId);
  }
  return cache;
}

/** Tin mới tới: phòng có cache thì chèn; phòng đang mở mà chưa có cache thì giữ lại cho lần tải đang chạy. */
export function addIncoming(queryClient: QueryClient, message: ChatMessage, openRoom: boolean) {
  if (getMessages(queryClient, message.roomId)) {
    updateMessages(queryClient, message.roomId, (cache) => receiveMessage(cache, message));
  } else if (openRoom) {
    early.set(message.roomId, [...(early.get(message.roomId) ?? []), message]);
  }
}

/** Đang chờ thay tin tạm: socket báo trước thì POST lỗi (mất response) cũng không đánh dấu "Gửi lỗi". */
export const arrivedClientIds = new Set<string>();

/** Blob xem trước của từng tin tạm, giải phóng khi đã thay bằng tin thật hoặc khi xóa tin lỗi. */
export const tempBlobs = new Map<string, string[]>();

export function releaseBlobs(clientId: string) {
  for (const url of tempBlobs.get(clientId) ?? []) {
    URL.revokeObjectURL(url);
  }
  tempBlobs.delete(clientId);
}

function imageUrlsOf(message: ChatMessage): string[] {
  if (message.images?.length) {
    return message.images.map((image) => image.url);
  }
  return message.imageUrl ? [message.imageUrl] : [];
}

/** Chờ ảnh thật giải mã xong (tối đa 3 giây) để thay blob mà ảnh không nháy trắng. */
function preloadImages(urls: string[]): Promise<unknown> {
  const decoded = Promise.all(
    urls.map((url) => {
      const img = new Image();
      img.src = fileSrc(url);
      return img.decode().catch(() => undefined);
    }),
  );
  return Promise.race([
    decoded,
    new Promise((resolve) => window.setTimeout(resolve, IMAGE_SWAP_WAIT_MS)),
  ]);
}

/** Thay tin tạm bằng tin thật; POST và socket cùng gọi được, bên nào xong trước thì thắng. */
export async function settleSent(queryClient: QueryClient, clientId: string, real: ChatMessage) {
  const temp = getMessages(queryClient, real.roomId)?.items.find(
    (item) => isTemp(item) && item.clientId === clientId,
  );
  if (temp && imageUrlsOf(temp).length) {
    await preloadImages(imageUrlsOf(real));
  }
  updateMessages(queryClient, real.roomId, (cache) => settleTemp(cache, clientId, real));
  releaseBlobs(clientId);
  dropEntry(clientId);
}

/**
 * Socket nối lại: phòng đang mở tải lại trang mới nhất, phòng khác bỏ cache vì đã lỡ sự kiện
 * (trừ phòng còn tin tạm, để tin đang gửi/gửi lỗi không biến mất).
 */
export function refreshAfterReconnect(queryClient: QueryClient, openRoomId: string) {
  queryClient.removeQueries({
    queryKey: queryKeys.allMessages,
    predicate: (query) => {
      const data = query.state.data as MessagesCache | undefined;
      return query.queryKey[1] !== openRoomId && !data?.items.some(isTemp);
    },
  });
  if (openRoomId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.messages(openRoomId) });
  }
}
