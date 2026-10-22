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
          dot={isDirect ? isPeerOnline : props.isGroupOnline}
          color="#31a24c"
          offset={[-2, 4]}
        >
          <Avatar
            size={40}
            className="avatar-initials"
            src={room?.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
            style={{
              background: room ? avatarColor(room.title || room.name) : '#0084ff',
            }}
          >
            {room ? initials(room.title || room.name) : '?'}
          </Avatar>
        </Badge>
        <div>
          <strong className="chat-head-name">
            {room ? (room.title || room.name) : 'Chọn phòng'}
          </strong>
          <small>
            {isDirect ? (
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
