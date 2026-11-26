import { message } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { UserAvatar } from '@/components/UserAvatar';
import type { PresenceUser, Room, User } from '@/types';
import { isDirectRoom } from '../utils/rooms';

const MAX_ONLINE = 12;

type OnlineEntry = {
  id: string;
  name: string;
  avatarUrl?: string;
};

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return parts.join(' ') || name;
  }
  return parts.slice(-2).join(' ');
}

export function OnlineStrip(props: {
  user: User;
  onlineUsers: PresenceUser[];
  rooms: Room[];
  onOpenRoom: (room: Room) => void;
}) {
  const { user, onlineUsers, rooms, onOpenRoom } = props;
  const [openingId, setOpeningId] = useState<string | null>(null);

  const items = useMemo(() => {
    // presence.online không có ảnh đại diện: lấy ảnh từ phòng 1-1 nếu đã có.
    const avatarOf = new Map<string, string | undefined>();
    for (const r of rooms) {
      if (isDirectRoom(r) && r.peerUserId) {
        avatarOf.set(r.peerUserId, r.avatarUrl);
      }
    }

    const list: OnlineEntry[] = [];
    const seen = new Set<string>([user.id]);

    for (const u of onlineUsers) {
      if (seen.has(u.id)) {
        continue;
      }
      seen.add(u.id);
      list.push({ id: u.id, name: u.name, avatarUrl: avatarOf.get(u.id) });
      if (list.length >= MAX_ONLINE) {
        break;
      }
    }

    return list;
  }, [user.id, onlineUsers, rooms]);

  if (items.length === 0) {
    return null;
  }

  async function handleUserClick(targetId: string) {
    if (openingId) {
      return;
    }
    setOpeningId(targetId);
    try {
      const room = await api.createDirectRoom(targetId);
      onOpenRoom(room);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.',
      );
    } finally {
      setOpeningId((current) => (current === targetId ? null : current));
    }
  }

  return (
    <div className="online-strip">
      <div className="online-strip-title">Đang hoạt động</div>
      <div className="online-strip-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="online-strip-item"
            title={item.name}
            aria-label={`Nhắn tin với ${item.name}`}
            disabled={openingId === item.id}
            onClick={() => void handleUserClick(item.id)}
          >
            <div className="online-strip-avatar-wrap">
              <UserAvatar
                size={48}
                className="avatar-initials"
                src={item.avatarUrl}
                name={item.name}
                zoomable={false}
                online
              />
            </div>
            <span className="online-strip-name">{shortName(item.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
