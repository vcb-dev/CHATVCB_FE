import { Avatar, Badge } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room } from '@/types';

export function RoomListItem(props: {
  room: Room;
  active: boolean;
  online: boolean;
  onSelect: (room: Room) => void;
}) {
  const { room } = props;
  const name = room.title || room.name;
  const hasUnread = room.unreadCount > 0;
  const showOnline = !hasUnread && props.online;

  return (
    <button
      className={['room-item', props.active ? 'active' : '', hasUnread ? 'unread' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => props.onSelect(room)}
      type="button"
    >
      <Badge
        count={hasUnread ? room.unreadCount : undefined}
        overflowCount={99}
        dot={showOnline}
        color={showOnline ? '#31a24c' : undefined}
        offset={[-2, 4]}
      >
        <Avatar
          size={48}
          className="avatar-initials"
          src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
          style={{ background: avatarColor(name) }}
        >
          {initials(name)}
        </Avatar>
      </Badge>
      <span className="room-meta">
        <strong>{name}</strong>
        <small>{room.lastMessagePreview || 'Chưa có tin nhắn'}</small>
      </span>
    </button>
  );
}
