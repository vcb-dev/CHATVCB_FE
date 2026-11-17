import { isDirectRoom } from './rooms';
import type { PresenceUser, Room, RoomMember } from '@/types';

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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function parseLastSeenElapsed(iso: string | undefined, now: number) {
  if (!iso) return null;
  const ts = Date.parse(iso);
  // now chỉ cập nhật mỗi phút nên có thể cũ hơn mốc vừa nhận qua socket: chặn về 0.
  return { ts, diffMs: Math.max(0, now - ts) };
}

function startOfLocalDay(ts: number): number {
  return new Date(ts).setHours(0, 0, 0, 0);
}

function formatLocalDate(ts: number): string {
  const date = new Date(ts);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function lastSeenText(online: boolean, iso: string | undefined, now: number): string {
  if (online) return 'Đang hoạt động';
  const parsed = parseLastSeenElapsed(iso, now);
  if (!parsed) return 'Không hoạt động';
  const { ts, diffMs } = parsed;
  if (diffMs < MINUTE_MS) return 'Vừa truy cập';
  if (diffMs < HOUR_MS) return `Hoạt động ${Math.floor(diffMs / MINUTE_MS)} phút trước`;
  if (diffMs < DAY_MS) return `Hoạt động ${Math.floor(diffMs / HOUR_MS)} giờ trước`;
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(ts)) / DAY_MS);
  if (days === 1) return 'Hoạt động hôm qua';
  if (days < 7) return `Hoạt động ${days} ngày trước`;
  return `Hoạt động ${formatLocalDate(ts)}`;
}

export function lastSeenShort(online: boolean, iso: string | undefined, now: number): string {
  if (online) return '';
  const parsed = parseLastSeenElapsed(iso, now);
  if (!parsed) return '';
  const { diffMs } = parsed;
  if (diffMs >= DAY_MS) return '';
  if (diffMs < MINUTE_MS) return '1 phút';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} phút`;
  return `${Math.floor(diffMs / HOUR_MS)} giờ`;
}
