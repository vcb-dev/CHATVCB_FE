import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from './api';
import { connectSocket } from './socket';
import type { ChatMessage, PresenceUser, Room, User } from './types';

type Props = {
  user: User;
  onLogout: () => void;
};

export function ChatPage({ user, onLogout }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef('');

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .rooms()
      .then((next) => {
        if (cancelled) {
          return;
        }
        setRooms(next);
        setRoomId((current) => current || next[0]?.id || '');
      })
      .catch(() => setError('Không tải được danh sách phòng.'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    let cancelled = false;
    setPending(false);
    api
      .messages(roomId)
      .then((next) => {
        if (!cancelled) {
          setMessages(next);
        }
      })
      .catch(() => setError('Không tải được tin nhắn.'));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const token = localStorage.getItem('chatvcb.token');
    if (!token) {
      return;
    }
    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.on('connect', () => {
      if (roomIdRef.current) {
        socket.emit('join', roomIdRef.current);
      }
    });
    socket.on('message', (message: ChatMessage) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
      if (message.role === 'agent') {
        setPending(false);
      }
    });
    socket.on('agent.pending', () => setPending(true));
    socket.on('room.presence', (users: PresenceUser[]) => setOnline(users));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
    if (roomId) {
      socketRef.current?.emit('join', roomId);
    }
  }, [roomId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!roomId || !draft.trim()) {
      return;
    }
    const content = draft.trim();
    setDraft('');
    setError('');
    try {
      const message = await api.sendMessage(roomId, content);
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
    } catch {
      setDraft(content);
      setError('Gửi tin thất bại.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>CHATVCB</strong>
          <span>Team {user.team ?? room?.team ?? 'sale'}</span>
        </div>
        <nav>
          {rooms.map((item) => (
            <button
              key={item.id}
              className={item.id === roomId ? 'room active' : 'room'}
              onClick={() => setRoomId(item.id)}
              type="button"
            >
              <span>{item.name}</span>
              <small>@{item.agentName}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <span>{user.name}</span>
            <small>Team {user.team ?? 'sale'}</small>
          </div>
          <button type="button" onClick={onLogout}>
            Thoát
          </button>
        </div>
      </aside>

      <main className="chat">
        <header>
          <div>
            <h1>{room?.name ?? 'Chọn phòng'}</h1>
            <p>
              Tag @agent hoặc @{room?.agentName} để hỏi AI. Online:{' '}
              {online.length ? online.map((item) => item.name).join(', ') : 'chỉ mình bạn'}
            </p>
          </div>
        </header>

        <div className="messages" ref={listRef}>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`bubble ${message.role} ${message.userId === user.id ? 'mine' : ''}`}
            >
              <div className="meta">
                <strong>{message.authorName}</strong>
                <time>{new Date(message.createdAt).toLocaleTimeString('vi-VN')}</time>
              </div>
              <p>{message.content}</p>
            </article>
          ))}
          {pending ? (
            <article className="bubble agent pending">
              <p>Agent đang xử lý...</p>
            </article>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSend}>
          {error ? <p className="error">{error}</p> : null}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              room
                ? `Nhắn tới ${room.name}. Ví dụ: @agent còn hàng SKU A không?`
                : 'Chọn phòng'
            }
            disabled={!roomId}
          />
          <button type="submit" disabled={!roomId || !draft.trim()}>
            Gửi
          </button>
        </form>
      </main>
    </div>
  );
}
