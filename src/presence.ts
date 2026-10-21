import { isDirectRoom } from './rooms';
import type { PresenceUser, Room, RoomMember } from './types';

export type Presence = {
  myId: string;
  online: PresenceUser[];
  onlineUserIds: Set<string>;
};

export function peerUserIdOf(room: Room | null, members: RoomMember[], myId: string) {
  if (!room) {
    return null;
  }
  return room.peerUserId || (isDirectRoom(room) ? members.find((m) => m.id !== myId)?.id : null);
}

export function isOtherUserOnline(presence: Presence, userId?: string | null) {
  return Boolean(
    userId &&
      userId !== presence.myId &&
      (presence.online.some((u) => u.id === userId) || presence.onlineUserIds.has(userId)),
  );
}

export function hasOnlineMember(presence: Presence, members: RoomMember[]) {
  return members.some((m) => isOtherUserOnline(presence, m.id));
}

export function countOnlineMembers(presence: Presence, members: RoomMember[]) {
  return members.filter(
    (m) => m.id === presence.myId || isOtherUserOnline(presence, m.id),
  ).length;
}

export function isOtherRoomOnline(presence: Presence, room: Room) {
  if (isDirectRoom(room)) {
    return Boolean(
      room.peerUserId &&
        room.peerUserId !== presence.myId &&
        presence.onlineUserIds.has(room.peerUserId),
    );
  }
  return Boolean(
    room.memberIds?.some((id) => id !== presence.myId && presence.onlineUserIds.has(id)),
  );
}
