import { Avatar, Badge } from 'antd';
import { fileSrc } from './api';
import { avatarColor, initials } from './theme';
import type { Room } from './types';

export function RoomListItem(props: {
  room: Room;
  active: boolean;
  onSelect: (room: Room) => void;
}) {
  const { room } = props;
  const name = room.title || room.name;
  const hasUnread = room.unreadCount > 0;

  return (
    <button
      className={['room-item', props.active ? 'active' : '', hasUnread ? 'unread' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => props.onSelect(room)}
      type="button"
    >
      <Badge count={room.unreadCount} overflowCount={99}>
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
