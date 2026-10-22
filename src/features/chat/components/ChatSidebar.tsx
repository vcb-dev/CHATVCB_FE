import { CameraOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, Spin } from 'antd';
import { useRef, type UIEvent } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { PageMeta, Room, User } from '@/types';
import { RoomListItem } from './RoomListItem';
import { SidebarSearch } from './SidebarSearch';

export function ChatSidebar(props: {
  user: User;
  team: string;
  rooms: Room[];
  roomId: string;
  roomsMeta: PageMeta;
  loadingOlderRooms: boolean;
  searchText: string;
  isRoomOnline: (room: Room) => boolean;
  onSearchTextChange: (value: string) => void;
  onSelectRoom: (room: Room) => void;
  onOpenRoom: (room: Room) => void;
  onOpenMessage: (roomId: string, messageId: string, createdAt?: string) => void;
  onLoadMoreRooms: () => Promise<void>;
  onNewChat: () => void;
  onOpenProfile: () => void;
  onChangeAvatar: (file: File) => Promise<void>;
}) {
  const { user, team, rooms, roomsMeta, searchText } = props;
  const myAvatarRef = useRef<HTMLInputElement>(null);

  function handleRoomsScroll(e: UIEvent<HTMLDivElement>) {
    if (searchText.trim() || props.loadingOlderRooms || !roomsMeta.hasMore || !roomsMeta.nextCursor) {
      return;
    }
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom < 80) {
      void props.onLoadMoreRooms();
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <strong>Messenger</strong>
          <small>Team {team}</small>
        </div>
        <Button
          type="text"
          shape="circle"
          icon={<PlusOutlined />}
          className="sidebar-new-btn"
          title="Cuộc trò chuyện mới"
          onClick={props.onNewChat}
        />
      </div>
      <div className="sidebar-search-box">
        <Input
          prefix={<SearchOutlined style={{ color: '#8a8d91' }} />}
          placeholder="Tìm người, nhóm, tin nhắn"
          allowClear
          value={searchText}
          onChange={(e) => props.onSearchTextChange(e.target.value)}
        />
      </div>
      {searchText.trim() ? (
        <SidebarSearch
          query={searchText}
          onClose={() => props.onSearchTextChange('')}
          onOpenRoom={props.onOpenRoom}
          onOpenMessage={props.onOpenMessage}
          rooms={rooms}
        />
      ) : (
        <div className="room-list" onScroll={handleRoomsScroll}>
          {rooms.map((item) => (
            <RoomListItem
              key={item.id}
              room={item}
              active={item.id === props.roomId}
              online={props.isRoomOnline(item)}
              onSelect={props.onSelectRoom}
            />
          ))}
          {props.loadingOlderRooms ? (
            <div className="room-list-loading">
              <Spin size="small" /> <span>Đang tải thêm…</span>
            </div>
          ) : null}
        </div>
      )}
      <div className="sidebar-foot">
        <button
          type="button"
          className="user-avatar-btn"
          title="Đổi ảnh đại diện"
          onClick={() => myAvatarRef.current?.click()}
        >
          <Avatar
            src={user.avatarUrl ? fileSrc(user.avatarUrl) : undefined}
            style={{ background: avatarColor(user.name), color: '#fff', fontWeight: 700 }}
          >
            {initials(user.name)}
          </Avatar>
          <span className="user-cam">
            <CameraOutlined />
          </span>
        </button>
        <input
          ref={myAvatarRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void props.onChangeAvatar(file);
            }
          }}
        />
        <button type="button" className="who profile-who" onClick={props.onOpenProfile}>
          <strong>{user.name}</strong>
          <small>Team {team}</small>
        </button>
      </div>
    </aside>
  );
}
