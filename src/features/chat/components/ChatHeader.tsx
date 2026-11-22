import {
  ArrowLeftOutlined,
  CloudOutlined,
  LayoutOutlined,
  PhoneOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { MenuButton } from '@/components/MenuButton';
import { UserAvatar } from '@/components/UserAvatar';
import type { Room } from '@/types';
import { lastSeenText } from '../utils/presence';

export function ChatHeader(props: {
  room: Room | null;
  isDirect: boolean;
  isPeerOnline: boolean;
  lastSeenAt?: string;
  now: number;
  membersCount: number;
  onlineMembersCount: number;
  infoOpen: boolean;
  onToggleInfo: () => void;
  onSearch: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  /** Chat 1-1: bấm avatar/tên mở hồ sơ người bên kia. */
  onOpenProfile?: () => void;
  /** Điện thoại: về danh sách phòng, thay chỗ nút menu */
  onBack?: () => void;
  /** Số phòng có tin chưa đọc, hiện cạnh nút quay lại */
  backBadge?: number;
}) {
  const { room, isDirect, isPeerOnline, membersCount, onlineMembersCount } = props;
  const isCloud = room?.isCloud ?? false;
  const roomLabel = room ? (room.title || room.name) : '';
  const openProfile = isDirect && !isCloud ? props.onOpenProfile : undefined;
  // Bị người kia chặn thì không thấy trạng thái hoạt động của họ (như Messenger)
  const hidePresence = Boolean(room?.blockedMe);

  const toggleNarrowInfo = () => {
    if (window.matchMedia('(max-width: 1100px)').matches) {
      props.onToggleInfo();
    }
  };

  return (
    <header className="chat-head">
      {props.onBack ? (
        <button
          type="button"
          className="chat-head-back"
          aria-label="Về danh sách tin nhắn"
          onClick={props.onBack}
        >
          <ArrowLeftOutlined />
          {props.backBadge ? (
            <span className="chat-head-back-badge">
              {props.backBadge > 99 ? '99+' : props.backBadge}
            </span>
          ) : null}
        </button>
      ) : (
        <MenuButton />
      )}
      <div className="chat-head-info">
        <UserAvatar
          size={44}
          className="avatar-initials"
          src={isCloud ? undefined : room?.avatarUrl}
          name={roomLabel}
          icon={isCloud ? <CloudOutlined /> : undefined}
          online={!isCloud && isDirect && isPeerOnline && !hidePresence}
          zoomable={Boolean(room && !isCloud && !openProfile)}
          zoomTitle={isDirect ? 'Xem ảnh đại diện' : 'Xem ảnh nhóm'}
          onClick={openProfile}
          style={{
            ...(isCloud || !room ? { background: 'var(--ui-primary)' } : undefined),
            ...(openProfile ? { cursor: 'pointer' } : undefined),
          }}
        >
          {!room ? '?' : undefined}
        </UserAvatar>
        <button
          type="button"
          className="chat-head-text"
          disabled={!room}
          title={openProfile ? 'Xem hồ sơ' : undefined}
          onClick={openProfile ?? toggleNarrowInfo}
        >
          <strong className="chat-head-name">
            {room ? roomLabel : 'Chọn phòng'}
          </strong>
          <small>
            {isCloud ? (
              'Lưu tin nhắn, ảnh, tệp của riêng bạn'
            ) : isDirect ? (
              room?.blockedByMe ? (
                'Đã chặn'
              ) : hidePresence ? null : (
                lastSeenText(isPeerOnline, props.lastSeenAt, props.now)
              )
            ) : (
              <>
                {membersCount
                  ? `${membersCount} thành viên`
                  : 'Gõ @ để tag đồng đội'}
                {membersCount && onlineMembersCount > 0
                  ? ` · Online ${onlineMembersCount}`
                  : ''}
              </>
            )}
          </small>
        </button>
      </div>

      <div className="chat-head-actions">
        <Tooltip title="Tìm trong cuộc trò chuyện">
          <Button
            type="text"
            className="chat-head-btn"
            icon={<SearchOutlined />}
            aria-label="Tìm trong cuộc trò chuyện"
            onClick={props.onSearch}
            disabled={!room}
          />
        </Tooltip>
        {!isCloud && props.onStartAudioCall ? (
          <Tooltip title={isDirect ? 'Gọi thoại' : 'Gọi thoại nhóm'}>
            <Button
              type="text"
              className="chat-head-btn"
              icon={<PhoneOutlined />}
              aria-label={isDirect ? 'Gọi thoại' : 'Gọi thoại nhóm'}
              onClick={props.onStartAudioCall}
              disabled={!room}
            />
          </Tooltip>
        ) : null}
        {!isCloud && props.onStartVideoCall ? (
          <Tooltip title={isDirect ? 'Gọi video' : 'Gọi video nhóm'}>
            <Button
              type="text"
              className="chat-head-btn"
              icon={<VideoCameraOutlined />}
              aria-label={isDirect ? 'Gọi video' : 'Gọi video nhóm'}
              onClick={props.onStartVideoCall}
              disabled={!room}
            />
          </Tooltip>
        ) : null}
        <Tooltip title={props.infoOpen ? 'Ẩn thông tin hội thoại' : 'Hiện thông tin hội thoại'}>
          <Button
            type="text"
            className={props.infoOpen ? 'chat-head-btn active' : 'chat-head-btn'}
            icon={<LayoutOutlined />}
            aria-label="Bật/tắt bảng thông tin"
            onClick={props.onToggleInfo}
            disabled={!room}
          />
        </Tooltip>
      </div>
    </header>
  );
}
