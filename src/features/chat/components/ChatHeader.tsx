import { CloudOutlined } from '@ant-design/icons';
import { Avatar, Badge } from 'antd';
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
  onToggleInfo: () => void;
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
            size={40}
            className="avatar-initials"
            icon={isCloud ? <CloudOutlined /> : undefined}
            src={room?.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
            style={{
              background: isCloud ? '#0084ff' : room ? avatarColor(room.title || room.name) : '#0084ff',
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
    </header>
  );
}
