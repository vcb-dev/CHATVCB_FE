import {
  CloudOutlined,
  LayoutOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Tooltip } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room } from '@/types';

export function ChatHeader(props: {
  room: Room | null;
  isDirect: boolean;
  isPeerOnline: boolean;
  isGroupOnline: boolean;
  membersCount: number;
  onlineMembersCount: number;
  infoOpen: boolean;
  onToggleInfo: () => void;
  onSearch: () => void;
  onStartMeeting?: () => void;
}) {
  const { room, isDirect, isPeerOnline, membersCount, onlineMembersCount } = props;
  const isCloud = room?.isCloud ?? false;

  return (
    <header className="chat-head">
      <button
        type="button"
        className="chat-head-info"
        disabled={!room}
        onClick={() => {
          if (window.matchMedia('(max-width: 1100px)').matches) {
            props.onToggleInfo();
          }
        }}
      >
        <Badge
          dot={!isCloud && (isDirect ? isPeerOnline : props.isGroupOnline)}
          color="#31a24c"
          offset={[-2, 4]}
        >
          <Avatar
            size={44}
            className="avatar-initials"
            icon={isCloud ? <CloudOutlined /> : undefined}
            src={room?.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
            style={{
              background: isCloud ? 'var(--ui-primary)' : room ? avatarColor(room.title || room.name) : 'var(--ui-primary)',
            }}
          >
            {isCloud ? null : room ? initials(room.title || room.name) : '?'}
          </Avatar>
        </Badge>
        <div>
          <strong className="chat-head-name">
            {room ? (room.title || room.name) : 'Chọn phòng'}
          </strong>
          <small>
            {isCloud ? (
              'Lưu tin nhắn, ảnh, tệp của riêng bạn'
            ) : isDirect ? (
              isPeerOnline ? 'Đang hoạt động' : 'Không hoạt động'
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
        </div>
      </button>

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
        {!isCloud && props.onStartMeeting ? (
          <Tooltip title="Bắt đầu cuộc họp">
            <Button
              type="text"
              className="chat-head-btn"
              icon={<VideoCameraOutlined />}
              aria-label="Bắt đầu cuộc họp"
              onClick={props.onStartMeeting}
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
