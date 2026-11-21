import {
  CloudOutlined,
  ExclamationCircleFilled,
  MoreOutlined,
  MutedOutlined,
  PushpinFilled,
  StopOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import type { ConversationLabel, Room } from '@/types';
import { formatRoomTime } from '../utils/datetime';
import { useRoomSendFailed } from '../hooks/useOutbox';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { isDirectRoom, isRoomMuted, sameRoom } from '../utils/rooms';
import { RoomMenu } from './RoomMenu';

type Props = {
  room: Room;
  active: boolean;
  online: boolean;
  /** Nhãn "N phút" trên avatar phòng 1-1 khi người kia offline; rỗng thì không hiện. */
  lastSeenLabel: string;
  onSelect: (room: Room) => void;
  actions: ReturnType<typeof useRoomPrefs>;
  label?: ConversationLabel;
  labels?: ConversationLabel[];
  draft?: string;
  onManageLabels?: () => void;
};

function RoomListItemView(props: Props) {
  const { room, actions, label, labels, onManageLabels } = props;
  const name = room.title || room.name;
  const hasUnread = room.unreadCount > 0 || (room.markedUnread ?? false);
  const showCount = room.unreadCount > 0;
  const showMarkedDot = !showCount && (room.markedUnread ?? false);
  const showOnline = isDirectRoom(room) && !hasUnread && props.online;
  const muted = isRoomMuted(room);
  const timeStr = formatRoomTime(room.updatedAt);
  const sendFailed = useRoomSendFailed(room.id);

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
            <UserAvatar
              size={48}
              className="avatar-initials"
              icon={room.isCloud ? <CloudOutlined /> : undefined}
              src={room.isCloud ? undefined : room.avatarUrl}
              name={name}
              zoomable={false}
              online={showOnline}
              style={room.isCloud ? { background: 'var(--ui-primary)' } : undefined}
            />
            {props.lastSeenLabel ? (
              <span className="room-last-seen">{props.lastSeenLabel}</span>
            ) : null}
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
                {room.blockedByMe ? (
                  <StopOutlined className="room-muted" title="Đã chặn" aria-label="Đã chặn" />
                ) : null}
              </span>
              {timeStr ? <time className="room-time">{timeStr}</time> : null}
            </div>

            <div className="room-bottom-row">
              <div className="room-preview-col">
                {sendFailed ? (
                  <span className="room-send-failed" role="img" aria-label="Có tin gửi lỗi" title="Có tin gửi lỗi">
                    <ExclamationCircleFilled />
                  </span>
                ) : null}
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
                <span
                  className={
                    muted
                      ? 'room-badge muted'
                      : room.mentioned
                        ? 'room-badge mentioned'
                        : 'room-badge'
                  }
                >
                  {room.unreadCount > 99 ? '99+' : room.unreadCount}
                </span>
              ) : showMarkedDot ? (
                <span className={muted ? 'room-unread-dot muted' : 'room-unread-dot'} />
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

// Mỗi dòng dựng sẵn hai menu chuột phải nên rất tốn khi vẽ: chỉ vẽ lại khi chính phòng đó đổi
export const RoomListItem = memo(
  RoomListItemView,
  (a, b) =>
    a.active === b.active &&
    a.online === b.online &&
    a.lastSeenLabel === b.lastSeenLabel &&
    a.onSelect === b.onSelect &&
    a.actions === b.actions &&
    a.label === b.label &&
    a.labels === b.labels &&
    a.draft === b.draft &&
    a.onManageLabels === b.onManageLabels &&
    sameRoom(a.room, b.room),
);
