import { CloudOutlined, MoreOutlined, MutedOutlined, PushpinFilled } from '@ant-design/icons';
import { Avatar } from 'antd';
import { memo } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { ConversationLabel, Room } from '@/types';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { isRoomMuted, sameRoom } from '../utils/rooms';
import { RoomMenu } from './RoomMenu';

type Props = {
  room: Room;
  active: boolean;
  online: boolean;
  onSelect: (room: Room) => void;
  actions: ReturnType<typeof useRoomPrefs>;
  label?: ConversationLabel;
  labels?: ConversationLabel[];
  draft?: string;
  onManageLabels?: () => void;
};

function formatRoomTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (isNaN(d.getTime())) return '';
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function RoomListItemView(props: Props) {
  const { room, actions, label, labels, onManageLabels } = props;
  const name = room.title || room.name;
  const hasUnread = room.unreadCount > 0 || (room.markedUnread ?? false);
  const showCount = room.unreadCount > 0;
  const showMarkedDot = !showCount && (room.markedUnread ?? false);
  const showOnline = !hasUnread && props.online;
  const muted = isRoomMuted(room);
  const timeStr = formatRoomTime(room.updatedAt);

  return (
    <div className="room-item-wrap">
      <RoomMenu
        room={room}
        actions={actions}
        trigger={['contextMenu']}
        labels={labels}
        onManageLabels={onManageLabels}
      >
        <button
          className={['room-item', props.active ? 'active' : '', hasUnread ? 'unread' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => props.onSelect(room)}
          type="button"
        >
          <div className="room-avatar-wrap">
            <Avatar
              size={48}
              className="avatar-initials"
              icon={room.isCloud ? <CloudOutlined /> : undefined}
              src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
              style={{ background: room.isCloud ? 'var(--ui-primary)' : avatarColor(name) }}
            >
              {room.isCloud ? null : initials(name)}
            </Avatar>
            {showOnline ? <span className="room-online-dot" /> : null}
          </div>

          <div className="room-meta">
            <div className="room-top-row">
              <span className="room-name-row">
                <strong>{name}</strong>
                {label ? (
                  <span
                    className="room-label-dot"
                    style={{ background: label.color }}
                    title={label.name}
                  />
                ) : null}
                {room.pinned ? (
                  <PushpinFilled className="room-pinned" title="Đã ghim" />
                ) : null}
                {muted ? (
                  <MutedOutlined className="room-muted" title="Đã tắt thông báo" />
                ) : null}
              </span>
              {timeStr ? <time className="room-time">{timeStr}</time> : null}
            </div>

            <div className="room-bottom-row">
              <div className="room-preview-col">
                {room.mentioned && !props.active ? (
                  <span className="room-mention" title="Có người tag bạn">
                    @
                  </span>
                ) : null}
                {props.draft && !props.active ? (
                  <small>
                    <span className="room-draft">Nháp:</span> {props.draft}
                  </small>
                ) : (
                  <small>{room.lastMessagePreview || 'Chưa có tin nhắn'}</small>
                )}
              </div>
              {showCount ? (
                <span className="room-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>
              ) : showMarkedDot ? (
                <span className="room-unread-dot" />
              ) : null}
            </div>
          </div>
        </button>
      </RoomMenu>
      <RoomMenu
        room={room}
        actions={actions}
        trigger={['click']}
        labels={labels}
        onManageLabels={onManageLabels}
      >
        <button
          className="room-item-more"
          aria-label="Tùy chọn"
          type="button"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreOutlined />
        </button>
      </RoomMenu>
    </div>
  );
}

export const RoomListItem = memo(
  RoomListItemView,
  (a, b) =>
    a.active === b.active &&
    a.online === b.online &&
    a.onSelect === b.onSelect &&
    a.actions === b.actions &&
    a.label === b.label &&
    a.labels === b.labels &&
    a.draft === b.draft &&
    a.onManageLabels === b.onManageLabels &&
    sameRoom(a.room, b.room),
);
