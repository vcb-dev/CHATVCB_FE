import type { ChatMessage, PendingImage, RichPayload } from '@/types';

/**
 * Hộp thư đi: các tin đang gửi / gửi lỗi của người đang đăng nhập, theo `clientId`.
 * - Giữ dữ liệu để "Thử lại" (nội dung, id ảnh/tệp đã tải lên) và để cột trái biết phòng nào có tin lỗi.
 * - Tin chỉ gồm dữ liệu ghi được (chữ, GIF, ảnh đã có id) thì ghi vào localStorage: F5 xong vẫn còn,
 *   hiện thành "Gửi lỗi" để người dùng tự bấm thử lại (không tự gửi một câu gõ từ lâu).
 *
 * File này chỉ import type để chạy kiểm được bằng node.
 */

/** Một tin cần gửi; ảnh: 1 tấm là tin ảnh, từ 2 tấm là album. */
export type SendInput = {
  content: string;
  replyTo?: ChatMessage | null;
  rich?: RichPayload;
  images?: PendingImage[];
  gifUrl?: string;
  file?: { blob: Blob; name: string; voice?: boolean };
};

/** Id ảnh/tệp đã tải lên của một tin, để "Thử lại" không tải lại phần đã lên. */
export type Uploads = { uploaded: string[]; fileId?: string };

export type OutboxEntry = {
  clientId: string;
  roomId: string;
  input: SendInput;
  /** Tin tạm đang vẽ trong khung chat (mang `sendState`). */
  temp: ChatMessage;
  uploads: Uploads;
  failed: boolean;
};

export const RELOAD_ERROR = 'Chưa gửi được trước khi tải lại trang.';

const KEY_PREFIX = 'chatvcb.outbox.';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Không còn blob nào phải tải lên: tệp và ảnh chọn từ máy chỉ sống trong phiên này. */
export function isPersistable(entry: OutboxEntry): boolean {
  const { input } = entry;
  if (input.file) {
    return false;
  }
  return (input.images ?? []).every((image) => Boolean(image.imageId) && !image.preview.startsWith('blob:'));
}

export function serializeOutbox(entries: OutboxEntry[]): string {
  return JSON.stringify(
    entries.filter(isPersistable).map(({ clientId, roomId, input, temp, uploads }) => ({
      clientId,
      roomId,
      input: {
        ...input,
        images: input.images?.map(({ key, preview, imageId }) => ({ key, preview, imageId })),
      },
      temp,
      uploads,
    })),
  );
}

function isEntryLike(value: unknown): value is Pick<OutboxEntry, 'clientId' | 'roomId' | 'input' | 'temp'> & {
  uploads?: Partial<Uploads>;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  const input = item.input as Record<string, unknown> | null | undefined;
  return (
    typeof item.clientId === 'string' &&
    typeof item.roomId === 'string' &&
    typeof input === 'object' &&
    input !== null &&
    typeof input.content === 'string' &&
    typeof item.temp === 'object' &&
    item.temp !== null
  );
}

/** Đọc lại sau khi tải trang: mọi tin còn trong hộp thư đi coi như gửi lỗi. */
export function parseOutbox(raw: string | null): OutboxEntry[] {
  if (!raw) {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isEntryLike).map((item) => ({
    clientId: item.clientId,
    roomId: item.roomId,
    input: item.input,
    uploads: { uploaded: item.uploads?.uploaded ?? [], fileId: item.uploads?.fileId },
    failed: true,
    temp: { ...item.temp, sendState: 'failed', sendError: RELOAD_ERROR },
  }));
}

// --- Kho trong bộ nhớ, ghi kèm localStorage ---

let owner: string | null = null;
let storage: StorageLike | null = null;
let entries = new Map<string, OutboxEntry>();
let failedRooms: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function persist() {
  if (!storage || !owner) {
    return;
  }
  try {
    const list = [...entries.values()];
    if (list.some(isPersistable)) {
      storage.setItem(KEY_PREFIX + owner, serializeOutbox(list));
    } else {
      storage.removeItem(KEY_PREFIX + owner);
    }
  } catch {
    // Hết chỗ hoặc trình duyệt chặn: vẫn gửi được, chỉ là F5 thì mất
  }
}

function changed(save = true) {
  const next = new Set<string>();
  for (const entry of entries.values()) {
    if (entry.failed) {
      next.add(entry.roomId);
    }
  }
  if (next.size !== failedRooms.size || [...next].some((id) => !failedRooms.has(id))) {
    failedRooms = next;
  }
  if (save) {
    persist();
  }
  listeners.forEach((listener) => listener());
}

/** Nạp hộp thư đi của người đang đăng nhập; gọi lại với cùng người thì bỏ qua. */
export function openOutbox(userId: string, store: StorageLike | null = browserStorage()) {
  if (owner === userId) {
    return;
  }
  owner = userId;
  storage = store;
  let raw: string | null = null;
  try {
    raw = store?.getItem(KEY_PREFIX + userId) ?? null;
  } catch {
    raw = null;
  }
  entries = new Map(parseOutbox(raw).map((entry) => [entry.clientId, entry]));
  changed(false);
}

export function getEntry(clientId: string): OutboxEntry | undefined {
  return entries.get(clientId);
}

export function entriesIn(roomId: string): OutboxEntry[] {
  return [...entries.values()].filter((entry) => entry.roomId === roomId);
}

export function putEntry(entry: OutboxEntry) {
  entries.set(entry.clientId, entry);
  changed();
}

/** `error` là câu lỗi khi gửi hỏng; `null` khi gửi lại (về "đang gửi"). */
export function setFailed(clientId: string, error: string | null) {
  const entry = entries.get(clientId);
  if (!entry) {
    return;
  }
  entries.set(clientId, {
    ...entry,
    failed: error !== null,
    temp: { ...entry.temp, sendState: error === null ? 'sending' : 'failed', sendError: error ?? undefined },
  });
  changed();
}

export function dropEntry(clientId: string) {
  if (entries.delete(clientId)) {
    changed();
  }
}

/** Rời phòng / bị mời ra / nhóm giải tán: tin chờ gửi của phòng đó không còn gửi được. */
export function dropRoom(roomId: string) {
  let dropped = false;
  for (const entry of [...entries.values()]) {
    if (entry.roomId === roomId) {
      entries.delete(entry.clientId);
      dropped = true;
    }
  }
  if (dropped) {
    changed();
  }
}

/** Phòng có tin gửi lỗi; giữ nguyên đối tượng khi không đổi để useSyncExternalStore không vẽ lại thừa. */
export function failedRoomIds(): ReadonlySet<string> {
  return failedRooms;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
