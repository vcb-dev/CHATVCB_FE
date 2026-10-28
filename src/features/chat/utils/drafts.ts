export type Drafts = Record<string, string>;

export const MAX_DRAFTS = 50;

const STORAGE_KEY = 'chatvcb.drafts';

export function loadDrafts(): Drafts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const drafts: Drafts = {};
    for (const [roomId, text] of Object.entries(parsed)) {
      if (typeof text === 'string' && text.trim()) {
        drafts[roomId] = text;
      }
    }
    return drafts;
  } catch {
    return {};
  }
}

export function saveDrafts(drafts: Drafts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // đầy bộ nhớ hoặc bị chặn: nháp chỉ còn trong phiên này
  }
}

/** Đặt (hoặc xóa khi rỗng) nháp của một phòng; nháp vừa sửa luôn nằm cuối, giữ tối đa MAX_DRAFTS phòng. */
export function withDraft(drafts: Drafts, roomId: string, text: string): Drafts {
  const next: Drafts = {};
  for (const [id, value] of Object.entries(drafts)) {
    if (id !== roomId) {
      next[id] = value;
    }
  }
  if (text.trim()) {
    next[roomId] = text;
  }
  const keys = Object.keys(next);
  if (keys.length <= MAX_DRAFTS) {
    return next;
  }
  const trimmed: Drafts = {};
  for (const id of keys.slice(keys.length - MAX_DRAFTS)) {
    trimmed[id] = next[id];
  }
  return trimmed;
}
