import type { Room } from './types';

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
