import { useEffect, useRef } from 'react';
import {
  CloudOutlined,
  RightOutlined,
  SearchOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Spin } from 'antd';
import { fileSrc } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { avatarColor, initials } from '@/lib/avatar';
import type { PageMeta, Room } from '@/types';
import { formatRoomTime } from '@/features/chat/utils/datetime';

type Props = {
  /** Đã lọc và xếp sẵn bằng `contactGroups`. */
  groups: Room[];
  searching: boolean;
  roomsMeta: PageMeta;
  loadingOlderRooms: boolean;
  onLoadMoreRooms: () => Promise<void>;
  onOpenRoom: (room: Room) => void;
  onCreateGroup: () => void;
};

/** Tab "Nhóm" của Danh bạ: dòng tạo nhóm mới rồi tới các nhóm đang tham gia. */
export function ContactsGroups(props: Props) {
  const { groups, roomsMeta, loadingOlderRooms, onLoadMoreRooms } = props;
  const autoLoadedRef = useRef('');

  // Danh sách phòng chia trang: mở tab này thì tải nốt để đủ nhóm (và đếm đúng).
  // Mỗi trang chỉ tự tải một lần, tải lỗi thì để nút "Tải thêm nhóm" thử lại.
  useEffect(() => {
    const cursor = roomsMeta.nextCursor;
    if (!roomsMeta.hasMore || !cursor || loadingOlderRooms || autoLoadedRef.current === cursor) {
      return;
    }
    autoLoadedRef.current = cursor;
    void onLoadMoreRooms();
  }, [roomsMeta.hasMore, roomsMeta.nextCursor, loadingOlderRooms, onLoadMoreRooms]);

  return (
    <>
      <button
        type="button"
        className="contacts-row contacts-row-btn contacts-create-group"
        onClick={props.onCreateGroup}
      >
        <span className="contacts-create-icon">
          <UsergroupAddOutlined />
        </span>
        <span className="contacts-info">
          <strong>Tạo nhóm mới</strong>
          <small>Cùng trò chuyện với đồng nghiệp</small>
        </span>
        <RightOutlined className="contacts-row-arrow" />
      </button>

      {groups.map((room) => {
        const name = room.title || room.name;
        const time = formatRoomTime(room.updatedAt);
        return (
          <button
            key={room.id}
            type="button"
            className="contacts-row contacts-row-btn"
            onClick={() => props.onOpenRoom(room)}
          >
            <span className="contacts-avatar">
              <Avatar
                size={44}
                icon={room.isCloud ? <CloudOutlined /> : undefined}
                src={room.avatarUrl ? fileSrc(room.avatarUrl) : undefined}
                style={{ background: room.isCloud ? 'var(--ui-primary)' : avatarColor(name) }}
              >
                {room.isCloud ? null : initials(name)}
              </Avatar>
            </span>
            <span className="contacts-info">
              <strong>{name}</strong>
              <small>{room.lastMessagePreview || 'Chưa có tin nhắn'}</small>
            </span>
            {time ? <time className="contacts-time">{time}</time> : null}
          </button>
        );
      })}

      {roomsMeta.hasMore ? (
        <div className="contacts-more">
          {loadingOlderRooms ? (
            <>
              <Spin size="small" /> Đang tải thêm nhóm…
            </>
          ) : (
            <Button onClick={() => void onLoadMoreRooms()}>Tải thêm nhóm</Button>
          )}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={props.searching ? <SearchOutlined /> : <UsergroupAddOutlined />}
          title={props.searching ? 'Không tìm thấy nhóm phù hợp' : 'Bạn chưa tham gia nhóm nào'}
        />
      ) : null}
    </>
  );
}
