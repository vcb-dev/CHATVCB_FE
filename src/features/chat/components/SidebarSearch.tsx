import { useEffect, useState } from 'react';
import { Avatar, Spin, message } from 'antd';
import { api, fileSrc } from '@/api/client';
import { roomFromHit } from '../utils/rooms';
import { avatarColor, initials } from '@/theme';
import type { DirectoryUser, MessageHit, Room, RoomHit, RoomSearch } from '@/types';

export function SidebarSearch(props: {
  query: string;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
  onOpenMessage: (roomId: string, messageId: string, createdAt: string) => void;
  rooms: Room[];
}) {
  const [results, setResults] = useState<RoomSearch | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = props.query.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void api
        .searchRooms(trimmed)
        .then((res) => {
          if (!cancelled) {
            setResults(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults({ users: [], rooms: [], messages: [] });
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [props.query]);

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

  if (loading) {
    return (
      <div className="sidebar-search-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const hasAny =
    results.users.length > 0 || results.rooms.length > 0 || results.messages.length > 0;

  if (!hasAny) {
    return <div className="sidebar-search-empty">Không có kết quả</div>;
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
              <Avatar
                size={36}
                src={u.avatarUrl ? fileSrc(u.avatarUrl) : undefined}
                style={{ background: avatarColor(u.name), flexShrink: 0 }}
              >
                {initials(u.name)}
              </Avatar>
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
              <Avatar
                size={36}
                className="avatar-initials"
                src={r.avatarUrl ? fileSrc(r.avatarUrl) : undefined}
                style={{ background: avatarColor(r.title || r.name), flexShrink: 0 }}
              >
                {initials(r.title || r.name)}
              </Avatar>
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
              <Avatar
                size={36}
                className="avatar-initials"
                src={m.roomAvatarUrl ? fileSrc(m.roomAvatarUrl) : undefined}
                style={{
                  background: avatarColor(m.roomTitle || m.authorName),
                  flexShrink: 0,
                }}
              >
                {initials(m.roomTitle || m.authorName)}
              </Avatar>
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
