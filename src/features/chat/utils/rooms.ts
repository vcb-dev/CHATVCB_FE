import type { ChatMessage, Room, RoomHit } from '@/types';
import { isVoice } from './attachments';
import { richLabel } from './rich';

export function roomFromHit(hit: RoomHit): Room {
  return {
    ...hit,
    updatedAt: new Date().toISOString(),
    createdById: null,
  };
}

export function isDirectRoom(room: Room): boolean {
  return room.type === 'direct' || room.kind === 'direct';
}

export const MUTE_OPTIONS: { minutes: number | null; label: string }[] = [
  { minutes: 60, label: '1 giờ' },
  { minutes: 240, label: '4 giờ' },
  { minutes: 480, label: '8 giờ' },
  { minutes: 1440, label: '24 giờ' },
  { minutes: null, label: 'Cho đến khi bật lại' },
];

export function isRoomMuted(room: Room, now: number = Date.now()): boolean {
  if (room.mutedUntil) {
    return new Date(room.mutedUntil).getTime() > now;
  }
  return Boolean(room.muted);
}

export function muteLabel(room: Room): string {
  if (room.mutedUntil) {
    const d = new Date(room.mutedUntil);
    if (d.getTime() > Date.now()) {
      const timeStr = d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      return `Tắt đến ${timeStr}`;
    }
  }
  if (room.muted) {
    return 'Đã tắt thông báo';
  }
  return '';
}

export function sortRooms(list: Room[]): Room[] {
  return [...list].sort((a, b) => {
    const pinA = Boolean(a.pinned);
    const pinB = Boolean(b.pinned);
    if (pinA !== pinB) {
      return pinA ? -1 : 1;
    }
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return timeB - timeA;
  });
}

export function upsertRoom(list: Room[], room: Room): Room[] {
  const index = list.findIndex((item) => item.id === room.id);
  let next: Room[];
  if (index >= 0) {
    next = [...list];
    next[index] = { ...next[index], ...room };
  } else {
    next = [room, ...list];
  }
  return sortRooms(next);
}

export function mergeRooms(
  prev: Room[],
  next: Room[],
  currentId: string,
  hasMore = false,
  viewing = false,
): Room[] {
  let combinedNext = next;
  if (hasMore && next.length > 0) {
    const nextIds = new Set(next.map((r) => r.id));
    const lastTime = new Date(next[next.length - 1].updatedAt).getTime();
    const olderRooms = prev.filter(
      (r) => !nextIds.has(r.id) && new Date(r.updatedAt).getTime() < lastTime,
    );
    combinedNext = [...next, ...olderRooms];
  }
  const nextList = sortRooms(combinedNext).map((r) =>
    viewing && r.id === currentId ? { ...r, unreadCount: 0 } : r,
  );
  const currentInPrev = prev.find((r) => r.id === currentId);
  if (
    currentInPrev &&
    isDirectRoom(currentInPrev) &&
    !currentInPrev.lastMessagePreview
  ) {
    const existsInNext = nextList.some((r) => r.id === currentId);
    if (!existsInNext) {
      return [currentInPrev, ...nextList];
    }
  }
  return nextList;
}

export function previewOf(
  message: ChatMessage,
  currentUserId?: string,
  isDirect = false,
): string {
  if (message.role === 'system') {
    return message.content;
  }
  let body = '';
  if (message.recalled) {
    body = 'Tin nhắn đã được thu hồi';
  } else if (message.rich) {
    body = richLabel(message.rich);
  } else if (message.imageId || message.imageUrl) {
    body = 'Hình ảnh';
  } else if (message.fileId || message.fileUrl) {
    body = isVoice(message)
      ? 'Tin nhắn thoại'
      : message.fileName
        ? `[Tệp] ${message.fileName}`
        : 'Tệp đính kèm';
  } else {
    const text = message.content.trim();
    body = text.length <= 120 ? text : `${text.slice(0, 120)}…`;
  }

  if (!body) {
    return '';
  }

  if (currentUserId && message.userId === currentUserId) {
    return `Bạn: ${body}`;
  }

  if (!isDirect && message.authorName) {
    return `${message.authorName}: ${body}`;
  }

  return body;
}

export function canEditItem(room: Room, creatorId: string, userId: string): boolean {
  return creatorId === userId || room.canManage === true;
}
