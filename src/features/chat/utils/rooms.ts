import type { ChatMessage, Room, RoomHit } from '@/types';
import { isVoice } from './attachments';

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

export function sortRooms(list: Room[]): Room[] {
  return [...list].sort((a, b) => {
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
