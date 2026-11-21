import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { roomFromHit } from '../utils/rooms';
import type { DirectoryUser, MessageHit, Room, RoomHit, RoomSearch } from '@/types';

const EMPTY_SEARCH: RoomSearch = { users: [], rooms: [], messages: [] };

export function SidebarSearch(props: {
  query: string;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
  onOpenMessage: (roomId: string, messageId: string, createdAt: string) => void;
  rooms: Room[];
}) {
  const trimmed = props.query.trim();
  const term = useDebouncedValue(trimmed);
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.searchAll(term),
    queryFn: () => api.searchRooms(term),
    enabled: term.length > 0,
    staleTime: 30_000,
  });

  async function handleUserClick(u: DirectoryUser) {
    try {
      const room = await api.createDirectRoom(u.id);
      props.onOpenRoom(room);
      props.onClose();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.',
      );
    }
  }

  function handleRoomClick(hit: RoomHit) {
    const existing = props.rooms.find((r) => r.id === hit.id);
    const target = existing ?? roomFromHit(hit);
    props.onOpenRoom(target);
    props.onClose();
  }

  async function handleMessageClick(msg: MessageHit) {
    try {
      if (msg.roomKind === 'direct' && msg.peerUserId) {
        const room = await api.createDirectRoom(msg.peerUserId);
        props.onOpenRoom(room);
        props.onOpenMessage(room.id, msg.id, msg.createdAt);
      } else {
        props.onOpenMessage(msg.roomId, msg.id, msg.createdAt);
      }
      props.onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không mở được tin nhắn.');
    }
  }

  if (!trimmed) {
    return null;
  }

  if (term !== trimmed || isPending) {
    return <LoadingState compact size="small" />;
  }

  if (isError) {
    return <EmptyState compact title="Không tải được kết quả" />;
  }

  const results = data ?? EMPTY_SEARCH;

  const hasAny =
    results.users.length > 0 || results.rooms.length > 0 || results.messages.length > 0;

  if (!hasAny) {
    return <EmptyState compact title="Không có kết quả" />;
  }

  return (
    <div className="sidebar-search">
      {results.users.length > 0 ? (
        <div className="search-group">
          <div className="search-group-title">Người</div>
          {results.users.map((u) => (
            <button
              key={u.id}
              type="button"
              className="search-hit-row"
              onClick={() => void handleUserClick(u)}
            >
              <UserAvatar
                size={36}
                src={u.avatarUrl}
                name={u.name}
                zoomable={false}
                style={{ flexShrink: 0 }}
              />
              <span className="search-hit-info">
                <strong>{u.name}</strong>
                <small>
                  {u.email} {u.team ? `· ${u.team}` : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {results.rooms.length > 0 ? (
        <div className="search-group">
          <div className="search-group-title">Nhóm & Cuộc trò chuyện</div>
          {results.rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              className="search-hit-row"
              onClick={() => handleRoomClick(r)}
            >
              <UserAvatar
                size={36}
                className="avatar-initials"
                src={r.avatarUrl}
                name={r.title || r.name}
                zoomable={false}
                style={{ flexShrink: 0 }}
              />
              <span className="search-hit-info">
                <strong>{r.title || r.name}</strong>
                <small>{r.lastMessagePreview || 'Chưa có tin nhắn'}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {results.messages.length > 0 ? (
        <div className="search-group">
          <div className="search-group-title">Tin nhắn</div>
          {results.messages.map((m) => (
            <button
              key={m.id}
              type="button"
              className="search-hit-row"
              onClick={() => void handleMessageClick(m)}
            >
              <UserAvatar
                size={36}
                className="avatar-initials"
                src={m.roomAvatarUrl}
                name={m.roomTitle || m.authorName}
                zoomable={false}
                style={{ flexShrink: 0 }}
              />
              <span className="search-hit-info">
                <div className="search-msg-head">
                  <strong>{m.roomTitle || m.authorName}</strong>
                  <time>
                    {new Date(m.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </time>
                </div>
                <small className="search-msg-content">{m.content}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
