import { CameraOutlined, CloudOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import type { ConversationLabel, PageMeta, Room, User } from '@/types';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import type { Drafts } from '../utils/drafts';
import { filterRooms, type RoomFilter } from '../utils/rooms';
import { LabelManagerModal } from './LabelManagerModal';
import { RoomFilterBar } from './RoomFilterBar';
import { RoomListItem } from './RoomListItem';
import { SidebarSearch } from './SidebarSearch';

const FILTER_MIN_ROWS = 10;
const NO_LABELS: ConversationLabel[] = [];

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
  onOpenCloud: () => void;
  onOpenProfile: () => void;
  onChangeAvatar: (file: File) => Promise<void>;
  prefs: ReturnType<typeof useRoomPrefs>;
  drafts: Drafts;
}) {
  const { user, team, rooms, roomsMeta, searchText } = props;
  const myAvatarRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<RoomFilter>({ kind: 'all' });
  const [managerOpen, setManagerOpen] = useState(false);
  const openManager = useCallback(() => setManagerOpen(true), []);

  const { data: labels = NO_LABELS } = useQuery({
    queryKey: queryKeys.labels,
    queryFn: api.labels,
  });

  useEffect(() => {
    if (filter.kind === 'label') {
      const exists = labels.some((l) => l.id === filter.labelId);
      if (!exists) {
        setFilter({ kind: 'all' });
      }
    }
  }, [labels, filter]);

  const labelMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const visibleRooms = useMemo(() => filterRooms(rooms, filter), [rooms, filter]);
  const autoLoadKeyRef = useRef('');

  useEffect(() => {
    if (
      filter.kind === 'all' ||
      searchText.trim() ||
      !roomsMeta.hasMore ||
      !roomsMeta.nextCursor ||
      props.loadingOlderRooms ||
      visibleRooms.length >= FILTER_MIN_ROWS
    ) {
      return;
    }
    // Mỗi trang chỉ tự tải một lần cho mỗi bộ lọc, để tải lỗi không lặp vô hạn
    const key = `${filter.kind === 'label' ? filter.labelId : filter.kind}|${roomsMeta.nextCursor}`;
    if (autoLoadKeyRef.current === key) {
      return;
    }
    autoLoadKeyRef.current = key;
    void props.onLoadMoreRooms();
  }, [filter, roomsMeta.hasMore, roomsMeta.nextCursor, props.loadingOlderRooms, visibleRooms.length, searchText]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button
            type="text"
            shape="circle"
            icon={<CloudOutlined />}
            className="sidebar-new-btn"
            title="Cloud của tôi"
            onClick={props.onOpenCloud}
          />
          <Button
            type="text"
            shape="circle"
            icon={<PlusOutlined />}
            className="sidebar-new-btn"
            title="Cuộc trò chuyện mới"
            onClick={props.onNewChat}
          />
        </div>
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
        <>
          <RoomFilterBar
            filter={filter}
            labels={labels}
            onChange={setFilter}
            onManage={() => setManagerOpen(true)}
          />
          <div className="room-list" onScroll={handleRoomsScroll}>
            {visibleRooms.length === 0 ? (
              <p className="room-list-empty">Không có cuộc trò chuyện nào.</p>
            ) : (
              visibleRooms.map((item) => (
                <RoomListItem
                  key={item.id}
                  room={item}
                  active={item.id === props.roomId}
                  online={props.isRoomOnline(item)}
                  onSelect={props.onSelectRoom}
                  actions={props.prefs}
                  label={item.labelId ? labelMap.get(item.labelId) : undefined}
                  labels={labels}
                  draft={props.drafts[item.id]}
                  onManageLabels={openManager}
                />
              ))
            )}
            {props.loadingOlderRooms ? (
              <div className="room-list-loading">
                <Spin size="small" /> <span>Đang tải thêm…</span>
              </div>
            ) : null}
          </div>
        </>
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

      <LabelManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </aside>
  );
}
