import { LogoutOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Mentions, Typography, message as antMessage } from 'antd';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from './api';
import {
  buildMentionOptions,
  handleFromEmail,
  MentionText,
  mentionOpen,
  mentionsUser,
} from './mentions';
import { connectSocket } from './socket';
import { initials } from './theme';
import type { ChatMessage, PresenceUser, Room, RoomMember, User } from './types';

type Props = {
  user: User;
  onLogout: () => void;
};

function sameAuthor(a: ChatMessage, b: ChatMessage) {
  return a.role === b.role && a.userId === b.userId && a.authorName === b.authorName;
}

export function ChatPage({ user, onLogout }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef('');
  const myHandle = handleFromEmail(user.email);

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );
  const team = user.team ?? room?.team ?? 'sale';
  const mentionOptions = useMemo(
    () => buildMentionOptions(members, online, user.id, room),
    [members, online, room, user.id],
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
    setMembersLoaded(false);
    api
      .messages(roomId)
      .then((next) => {
        if (!cancelled) {
          setMessages(next);
        }
      })
      .catch(() => setError('Không tải được tin nhắn.'));
    api
      .members(roomId)
      .then((next) => {
        if (!cancelled) {
          setMembers(next);
          setMembersLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          setMembersLoaded(true);
        }
      });
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
      if (
        message.userId !== user.id &&
        message.role === 'user' &&
        mentionsUser(message.content, myHandle)
      ) {
        void antMessage.info(`${message.authorName} đã tag bạn`);
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

  async function send() {
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (mentionOpen(draft)) {
        return;
      }
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Typography.Title level={4} style={{ margin: 0 }}>
            CHATVCB
          </Typography.Title>
          <Typography.Text type="secondary">Team {team}</Typography.Text>
        </div>
        <div className="room-list">
          {rooms.map((item) => (
            <button
              key={item.id}
              className={item.id === roomId ? 'room-item active' : 'room-item'}
              onClick={() => setRoomId(item.id)}
              type="button"
            >
              <Avatar style={{ background: '#0084ff' }}>{initials(item.name)}</Avatar>
              <span className="room-meta">
                <strong>{item.name}</strong>
                <small>@{item.agentName}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-foot">
          <Avatar style={{ background: '#00a400' }}>{initials(user.name)}</Avatar>
          <div className="who">
            <strong>{user.name}</strong>
            <small>Team {team}</small>
          </div>
          <Button type="text" danger icon={<LogoutOutlined />} onClick={onLogout}>
            Thoát
          </Button>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <Badge dot={online.length > 0} color="#31a24c">
            <Avatar size={40} style={{ background: '#0084ff' }}>
              {room ? initials(room.name) : '?'}
            </Avatar>
          </Badge>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {room?.name ?? 'Chọn phòng'}
            </Typography.Title>
            <Typography.Text type="secondary">
              Gõ @ để tag{' '}
              {mentionOptions.filter((item) => item.value !== 'agent' && item.value !== room?.agentName)
                .length
                ? mentionOptions
                    .filter((item) => item.value !== 'agent' && item.value !== room?.agentName)
                    .map((item) => `@${item.value}`)
                    .join(', ')
                : 'đồng đội'}
              {' · '}
              @{room?.agentName ?? 'agent'} để hỏi AI
              {online.length ? ` · Online: ${online.map((item) => item.name).join(', ')}` : ''}
            </Typography.Text>
          </div>
        </header>

        <div className="messages" ref={listRef}>
          {messages.map((message, index) => {
            const mine = message.userId === user.id;
            const agent = message.role === 'agent';
            const first =
              index === 0 || !sameAuthor(messages[index - 1], message);
            const tagged = !mine && mentionsUser(message.content, myHandle);
            const cls = [
              'row',
              mine ? 'mine' : 'theirs',
              agent ? 'agent' : '',
              tagged ? 'tagged' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={message.id} className={cls}>
                {!mine && first ? (
                  <Avatar
                    size={28}
                    icon={agent ? <RobotOutlined /> : undefined}
                    style={{ background: agent ? '#31a24c' : '#8a8d91' }}
                  >
                    {agent ? null : initials(message.authorName)}
                  </Avatar>
                ) : (
                  <span className="avatar-spacer" />
                )}
                <div className="stack">
                  {first && !mine ? (
                    <span className="who-line">{message.authorName}</span>
                  ) : null}
                  <div className="bubble">
                    <MentionText text={message.content} myHandle={myHandle} />
                  </div>
                  {first ? (
                    <time>
                      {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  ) : null}
                </div>
              </div>
            );
          })}
          {pending ? (
            <div className="row theirs agent">
              <Avatar size={28} icon={<RobotOutlined />} style={{ background: '#31a24c' }} />
              <div className="stack">
                <div className="bubble pending">
                  <p>Agent đang soạn tin...</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          {membersLoaded && members.length === 0 && mentionOptions.length <= 2 ? (
            <Typography.Text type="warning" style={{ width: '100%' }}>
              Chưa tải được danh sách đồng đội — redeploy BE mới trên Railway rồi tải lại trang.
            </Typography.Text>
          ) : null}
          <Mentions
            value={draft}
            onChange={setDraft}
            onKeyDown={handleKey}
            autoSize={{ minRows: 1, maxRows: 4 }}
            options={mentionOptions}
            prefix="@"
            placement="top"
            getPopupContainer={() => document.body}
            styles={{ popup: { zIndex: 2000 } }}
            placeholder={
              room
                ? `Nhắn ${room.name} · @sale2 · @${room.agentName} để hỏi AI`
                : 'Chọn phòng'
            }
            disabled={!roomId}
            notFoundContent="Không có người khớp"
          />
          <Button
            type="primary"
            shape="circle"
            htmlType="submit"
            icon={<SendOutlined />}
            disabled={!roomId || !draft.trim()}
          />
        </form>
      </main>
    </div>
  );
}
