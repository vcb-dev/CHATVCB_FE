import { CloudOutlined, MoreOutlined, MutedOutlined, PushpinFilled } from '@ant-design/icons';
import { Avatar, Badge } from 'antd';
import { memo } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { ConversationLabel, Room } from '@/types';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { isRoomMuted, sameRoom } from '../utils/rooms';
import { RoomMenu } from './RoomMenu';

type RoomListItemProps = {
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

function RoomListItemView(props: RoomListItemProps) {
  const { room, actions, label, labels, onManageLabels } = props;
  const name = room.title || room.name;
  const hasUnread = room.unreadCount > 0 || (room.markedUnread ?? false);
  const showCount = room.unreadCount > 0;
  const showMarkedDot = !showCount && (room.markedUnread ?? false);
  const showOnline = !hasUnread && props.online;
  const muted = isRoomMuted(room);

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
          <Badge
            count={showCount ? room.unreadCount : undefined}
            overflowCount={99}
            dot={showOnline || showMarkedDot}
            color={
              showMarkedDot
                ? '#0084ff'
                : showOnline
                ? '#31a24c'
                : muted
                ? '#8a8d91'
                : undefined
            }
            offset={[-2, 4]}
          >
            <Avatar
              size={48}
              className="avatar-initials"
              icon={room.isCloud ? <CloudOutlined /> : undefined}
              src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
              style={{ background: room.isCloud ? '#0084ff' : avatarColor(name) }}
            >
              {room.isCloud ? null : initials(name)}
            </Avatar>
          </Badge>
          <span className="room-meta">
            <span className="room-name-row">
              <strong>{name}</strong>
              {room.mentioned && !props.active ? (
                <span className="room-mention" title="Có người tag bạn">
                  @
                </span>
              ) : null}
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
            {props.draft && !props.active ? (
              <small>
                <span className="room-draft">Nháp:</span> {props.draft}
              </small>
            ) : (
              <small>{room.lastMessagePreview || 'Chưa có tin nhắn'}</small>
            )}
          </span>
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

// Mỗi dòng dựng sẵn hai menu chuột phải nên rất tốn khi vẽ: chỉ vẽ lại khi chính phòng đó đổi
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
