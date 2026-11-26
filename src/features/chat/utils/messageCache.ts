import type {
  ChatMessage,
  MessageReaction,
  MessageReply,
  MessagesPage,
  PageMeta,
  RichPayload,
} from '@/types';

/**
 * Tin của một phòng trong cache TanStack Query (`queryKeys.messages(roomId)`).
 * `items` tăng dần theo `createdAt`, tin tạm (đang gửi/gửi lỗi) luôn ở cuối.
 * `meta` là cursor để tải tin cũ hơn tin đầu tiên của `items`.
 *
 * File này chỉ import type để chạy kiểm được bằng `node --experimental-strip-types`.
 */
export type MessagesCache = { items: ChatMessage[]; meta: PageMeta };

/** Số tin giữ lại khi rời phòng: bằng một trang của BE. */
export const KEEP_ON_LEAVE = 80;
/** BE: MAX_REACTIONS_PER_USER. */
export const MAX_REACTIONS = 10;

export function isTemp(message: ChatMessage): boolean {
  return Boolean(message.sendState);
}

const timeOf = (message: ChatMessage) => Date.parse(message.createdAt);

/** Tin thật theo thời gian (giữ thứ tự cũ khi bằng giờ), tin tạm giữ thứ tự gửi và nằm cuối. */
export function sortMessages(items: ChatMessage[]): ChatMessage[] {
  const confirmed = items.filter((item) => !isTemp(item));
  const temps = items.filter(isTemp);
  confirmed.sort((a, b) => timeOf(a) - timeOf(b));
  return [...confirmed, ...temps];
}

function dedupe(items: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Trộn trang mới nhất vừa tải vào cache: trong khoảng thời gian của trang thì lấy đúng trang
 * (tin sửa/thu hồi/ẩn lúc vắng mặt), ngoài khoảng đó giữ tin cũ hơn và tin socket mới hơn.
 * `early` là tin socket tới trong lúc phòng chưa có cache.
 */
export function mergeLatest(
  cache: MessagesCache | undefined,
  page: MessagesPage,
  early: ChatMessage[] = [],
): MessagesCache {
  const current = cache?.items ?? [];
  const temps = current.filter(isTemp);
  const confirmed = dedupe([...current.filter((item) => !isTemp(item)), ...early]);
  const fresh = page.data;
  if (fresh.length === 0) {
    return { items: sortMessages([...dedupe(early), ...temps]), meta: page.meta };
  }
  const freshIds = new Set(fresh.map((item) => item.id));
  const oldestMs = timeOf(fresh[0]);
  const newestMs = timeOf(fresh[fresh.length - 1]);
  const olderCandidates = confirmed.filter(
    (item) => timeOf(item) < oldestMs && !freshIds.has(item.id),
  );
  const touches = confirmed.some((item) => freshIds.has(item.id));
  // Trang mới là toàn bộ lịch sử, hoặc không chạm cache (vắng lâu): đoạn cũ trong cache không còn tin được
  const keepOlder = page.meta.hasMore && touches;
  const older = keepOlder ? olderCandidates : [];
  const newer = confirmed.filter((item) => timeOf(item) > newestMs && !freshIds.has(item.id));
  return {
    items: sortMessages([...older, ...fresh, ...newer, ...temps]),
    meta: older.length && cache ? cache.meta : page.meta,
  };
}

/** Tin mới (socket, gửi xong, giao việc…): chèn theo thời gian, đã có thì thôi. */
export function receiveMessage(cache: MessagesCache, message: ChatMessage): MessagesCache {
  if (cache.items.some((item) => item.id === message.id)) {
    return cache;
  }
  return { ...cache, items: sortMessages([...cache.items, message]) };
}

const isTempOf = (clientId: string) => (item: ChatMessage) =>
  isTemp(item) && item.clientId === clientId;

export function hasTemp(cache: MessagesCache | undefined, clientId: string): boolean {
  return Boolean(cache?.items.some(isTempOf(clientId)));
}

/** Thay tin tạm bằng tin thật. Gọi nhiều lần (POST và socket) vẫn ra một kết quả. */
export function settleTemp(cache: MessagesCache, clientId: string, real: ChatMessage): MessagesCache {
  const rest = cache.items.filter((item) => !isTempOf(clientId)(item));
  if (rest.length === cache.items.length) {
    return receiveMessage(cache, real);
  }
  const items = rest.some((item) => item.id === real.id) ? rest : [...rest, real];
  return { ...cache, items: sortMessages(items) };
}

/** Thêm tin tạm, hoặc đưa tin lỗi về "đang gửi" khi thử lại. */
export function upsertTemp(cache: MessagesCache, temp: ChatMessage): MessagesCache {
  const match = isTempOf(temp.clientId ?? '');
  if (!cache.items.some(match)) {
    return { ...cache, items: sortMessages([...cache.items, temp]) };
  }
  return {
    ...cache,
    items: cache.items.map((item) =>
      match(item) ? { ...item, sendState: 'sending', sendError: undefined } : item,
    ),
  };
}

export function markTempFailed(cache: MessagesCache, clientId: string, error: string): MessagesCache {
  const match = isTempOf(clientId);
  if (!cache.items.some(match)) {
    return cache;
  }
  return {
    ...cache,
    items: cache.items.map((item) =>
      match(item) ? { ...item, sendState: 'failed', sendError: error } : item,
    ),
  };
}

/**
 * Đối chiếu tin chờ gửi với cache vừa tải: tin đã tới nơi (có tin thật cùng clientId, ví dụ gửi được ngay trước F5)
 * thì bỏ tin tạm và trả clientId trong `sent`; tin chưa có trong cache thì chèn tin tạm. Không đổi gì thì trả lại đúng cache cũ.
 */
export function reconcileTemps(
  cache: MessagesCache,
  temps: ChatMessage[],
): { cache: MessagesCache; sent: string[] } {
  const arrived = new Set<string>();
  const present = new Set<string>();
  for (const item of cache.items) {
    if (item.clientId) {
      (isTemp(item) ? present : arrived).add(item.clientId);
    }
  }
  const sent = temps
    .map((temp) => temp.clientId ?? '')
    .filter((clientId) => arrived.has(clientId));
  const missing = temps.filter(
    (temp) => temp.clientId && !arrived.has(temp.clientId) && !present.has(temp.clientId),
  );
  const stale = [...present].some((clientId) => arrived.has(clientId));
  if (!missing.length && !stale) {
    return { cache, sent };
  }
  const items = cache.items.filter(
    (item) => !(isTemp(item) && item.clientId && arrived.has(item.clientId)),
  );
  return { cache: { ...cache, items: sortMessages([...items, ...missing]) }, sent };
}

export function removeTemp(cache: MessagesCache, clientId: string): MessagesCache {
  const items = cache.items.filter((item) => !isTempOf(clientId)(item));
  return items.length === cache.items.length ? cache : { ...cache, items };
}

/** Rời phòng: giữ `keep` tin mới nhất để lần mở sau chỉ cần tải lại một trang. */
export function trimMessages(cache: MessagesCache, keep = KEEP_ON_LEAVE): MessagesCache {
  const confirmed = cache.items.filter((item) => !isTemp(item));
  if (confirmed.length <= keep) {
    return cache;
  }
  const kept = confirmed.slice(-keep);
  return {
    items: [...kept, ...cache.items.filter(isTemp)],
    // BE lọc createdAt < cursor nên tải tiếp từ đây không trùng, không hổng
    meta: { hasMore: true, nextCursor: kept[0].createdAt },
  };
}

/** Tin cũ hơn vừa tải (cuộn lên, nhảy tới tin). */
export function prependOlder(cache: MessagesCache, older: ChatMessage[], meta: PageMeta): MessagesCache {
  const known = new Set(cache.items.map((item) => item.id));
  const added = older.filter((item) => !known.has(item.id));
  return { items: sortMessages([...added, ...cache.items]), meta };
}

/**
 * Bật/tắt một cảm xúc của mình như BE (mỗi cặp người–emoji là một công tắc).
 * Trả `null` khi thêm mà đã đủ `max` cảm xúc trên tin.
 */
export function toggleReaction(
  reactions: MessageReaction[],
  me: { id: string; name: string; avatarUrl?: string },
  emoji: string,
  max = MAX_REACTIONS,
): MessageReaction[] | null {
  const existing = reactions.find((item) => item.emoji === emoji);
  if (existing?.userIds.includes(me.id)) {
    return reactions
      .map((item) =>
        item.emoji === emoji
          ? {
              ...item,
              count: item.count - 1,
              userIds: item.userIds.filter((id) => id !== me.id),
              users: item.users.filter((user) => user.id !== me.id),
            }
          : item,
      )
      .filter((item) => item.count > 0);
  }
  const mine = reactions.filter((item) => item.userIds.includes(me.id)).length;
  if (mine >= max) {
    return null;
  }
  const user = me.avatarUrl ? { id: me.id, name: me.name, avatarUrl: me.avatarUrl } : { id: me.id, name: me.name };
  if (!existing) {
    return [...reactions, { emoji, count: 1, userIds: [me.id], users: [user] }];
  }
  return reactions.map((item) =>
    item.emoji === emoji
      ? { ...item, count: item.count + 1, userIds: [...item.userIds, me.id], users: [...item.users, user] }
      : item,
  );
}

export function replyOf(message: ChatMessage): MessageReply {
  return {
    id: message.id,
    authorName: message.authorName,
    content: message.content,
    imageUrl: message.imageUrl,
    fileName: message.fileName,
    fileUrl: message.fileUrl,
    recalled: message.recalled,
  };
}

/** Tin tạm hiện ngay lúc bấm gửi; ảnh/tệp/thoại điền sẵn URL xem trước để đường vẽ cũ dùng lại. */
export function buildTempMessage(input: {
  clientId: string;
  roomId: string;
  user: { id: string; name: string; avatarUrl?: string };
  content: string;
  replyTo?: ChatMessage | null;
  rich?: RichPayload;
  imageUrl?: string;
  images?: { id: string; url: string }[];
  file?: { url: string; name: string; sizeBytes?: number; mimeType?: string };
}): ChatMessage {
  return {
    id: `tmp-${input.clientId}`,
    clientId: input.clientId,
    sendState: 'sending',
    roomId: input.roomId,
    userId: input.user.id,
    authorName: input.user.name,
    authorAvatarUrl: input.user.avatarUrl,
    role: 'user',
    content: input.content,
    rich: input.rich ?? null,
    imageUrl: input.imageUrl ?? null,
    images: input.images,
    fileUrl: input.file?.url ?? null,
    fileName: input.file?.name ?? null,
    fileSizeBytes: input.file?.sizeBytes ?? null,
    fileMimeType: input.file?.mimeType ?? null,
    replyToId: input.replyTo?.id ?? null,
    replyTo: input.replyTo ? replyOf(input.replyTo) : null,
    reactions: [],
    createdAt: new Date().toISOString(),
  };
}
