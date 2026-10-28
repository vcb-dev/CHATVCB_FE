import type { PresenceUser, Room, RoomMember } from '@/types';

export const MENTION = /(@[A-Za-z0-9._-]+)/g;

const OPEN_MENTION = /(?:^|[\s])@([A-Za-z0-9._-]*)$/;

export function handleFromEmail(email?: string) {
  return email?.split('@')[0] ?? '';
}

export function mentionOpen(draft: string) {
  return OPEN_MENTION.test(draft);
}

/** Gộp thành viên phòng (API) + đang online (socket) để ô @ luôn có người tag. */
export function buildMentionOptions(
  members: RoomMember[],
  online: PresenceUser[],
  userId: string,
  room: Room | null,
) {
  const map = new Map<string, { value: string; label: string }>();
  // 1-1 và Cloud không tag người, chỉ còn gọi agent
  const canTag = mentionsAllowed(room);
  for (const item of canTag ? members : []) {
    if (item.id === userId || !item.handle) {
      continue;
    }
    map.set(item.handle, {
      value: item.handle,
      label: `${item.displayName || item.name} (@${item.handle})`,
    });
  }
  for (const item of canTag ? online : []) {
    if (item.id === userId || !item.handle) {
      continue;
    }
    if (!map.has(item.handle)) {
      map.set(item.handle, {
        value: item.handle,
        label: `${item.name} (@${item.handle})`,
      });
    }
  }
  const agentName = room?.agentName?.trim();
  const everyone = canTag
    ? [{ value: ALL_HANDLE, label: '@all (Mọi người)' }]
    : [];
  const agents = [
    ...(agentName ? [{ value: agentName, label: `${agentName} (AI)` }] : []),
    { value: AGENT_HANDLE, label: '@agent (AI)' },
  ];
  return [...everyone, ...map.values(), ...agents];
}

// Cùng luật với BE (`extractMentions`): `@x` chỉ tính khi đứng đầu chuỗi hoặc sau ký tự
// không thuộc [A-Za-z0-9._-], nên địa chỉ email như `a@sale2.vn` không phải là tag.
const TAG = /(?:^|[^A-Za-z0-9._-])@([A-Za-z0-9._-]+)/g;

const ALL_HANDLE = 'all';

export const AGENT_HANDLE = 'agent';

/** Tag người (kể cả `@all`) chỉ có ở nhóm thật; 1-1 và Cloud chỉ còn gọi `@agent`. */
export function mentionsAllowed(room: Pick<Room, 'kind' | 'isCloud'> | null | undefined) {
  return Boolean(room && room.kind === 'group' && !room.isCloud);
}

export function mentionsUser(content: string, handle: string, everyone = false) {
  const mine = handle.toLowerCase();
  for (const match of content.matchAll(TAG)) {
    const tagged = match[1].toLowerCase().replace(/[._-]+$/, '');
    if ((mine && tagged === mine) || (everyone && tagged === ALL_HANDLE)) {
      return true;
    }
  }
  return false;
}
