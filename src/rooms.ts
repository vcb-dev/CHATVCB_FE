import type { ChatMessage, Room, RoomHit } from './types';

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

export function mergeRooms(prev: Room[], next: Room[], currentId: string): Room[] {
  const nextList = sortRooms(next);
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

export function previewOf(message: ChatMessage): string {
  if (message.recalled) {
    return 'Tin nhắn đã được thu hồi';
  }
  if (message.imageId || message.imageUrl) {
    return 'Hình ảnh';
  }
  if (message.fileId || message.fileUrl) {
    return message.fileName ? `[Tệp] ${message.fileName}` : 'Tệp đính kèm';
  }
  const text = message.content.trim();
  if (text.length <= 120) {
    return text;
  }
  return `${text.slice(0, 120)}…`;
}
