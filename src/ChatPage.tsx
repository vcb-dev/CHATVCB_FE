import { LogoutOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';
import { Avatar, Badge, Button, Image, Mentions, Typography, message as antMessage } from 'antd';
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { api, fileSrc } from './api';
import {
  addGalleryPick,
  addPendingFiles,
  ComposerActions,
  filesFromClipboard,
  GalleryModal,
  PendingPreviews,
  revokePending,
} from './media';
import {
  buildMentionOptions,
  handleFromEmail,
  MentionText,
  mentionOpen,
  mentionsUser,
} from './mentions';
import { lastSeenOn, SeenAvatars, SeenBubble, viewersOf } from './seen';
import { notifyIncoming, requestNotifyPermission, restoreTitle } from './notify';
import { ProfileDrawer } from './ProfileDrawer';
import { connectSocket } from './socket';
import { initials } from './theme';
import type {
  ChatMessage,
  GalleryImage,
  PendingImage,
  PresenceUser,
  Room,
  RoomMember,
  RoomRead,
  User,
} from './types';

type Props = {
  user: User;
  onLogout: () => void;
  onUserUpdate: (payload: { token: string; user: User }) => void;
};

function sameAuthor(a: ChatMessage, b: ChatMessage) {
  return a.role === b.role && a.userId === b.userId && a.authorName === b.authorName;
}

export function ChatPage({ user, onLogout, onUserUpdate }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reads, setReads] = useState<RoomRead[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef('');
  const mentionMeasuringRef = useRef(false);
  const lastSentRef = useRef<{ at: number; text: string }>({ at: 0, text: '' });
  const lastReadSentRef = useRef('');
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const userRef = useRef(user);
  const roomNameRef = useRef('');
  const myHandle = handleFromEmail(user.email);
  const myHandleRef = useRef(myHandle);
  pendingImagesRef.current = pendingImages;
  userRef.current = user;
  myHandleRef.current = myHandle;

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );
  const team = user.team ?? room?.team ?? 'sale';
  roomNameRef.current = room?.name ?? '';
  const mentionOptions = useMemo(
    () => buildMentionOptions(members, online, user.id, room),
    [members, online, room, user.id],
  );

  useEffect(() => {
    void requestNotifyPermission();
    const onVisible = () => {
      if (!document.hidden) {
        restoreTitle();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

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
    setReads([]);
    revokePending(pendingImagesRef.current);
    setPendingImages([]);
    setGalleryOpen(false);
    api
      .messages(roomId)
      .then((nextMessages) => {
        if (!cancelled) {
          setMessages(nextMessages);
        }
      })
      .catch(() => setError('Không tải được tin nhắn.'));
    api
      .reads(roomId)
      .then((nextReads) => {
        if (!cancelled) {
          setReads(nextReads);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReads([]);
        }
      });
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
      if (message.roomId && message.roomId !== roomIdRef.current) {
        return;
      }
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
      if (message.role === 'agent') {
        setPending(false);
      }
      const mine = message.userId === userRef.current.id;
      const tagged =
        !mine &&
        message.role === 'user' &&
        mentionsUser(message.content, myHandleRef.current);
      if (tagged) {
        void antMessage.info(`${message.authorName} đã tag bạn`);
      }
      if (!mine) {
        notifyIncoming({
          title: message.authorName,
          subtitle: roomNameRef.current,
          body: message.content.trim() || (message.imageUrl ? 'Đã gửi một ảnh' : 'Tin nhắn mới'),
          mentioned: tagged,
        });
      }
    });
    socket.on('agent.pending', () => setPending(true));
    socket.on('room.presence', (users: PresenceUser[]) => setOnline(users));
    socket.on('room.reads', (next: RoomRead[]) => setReads(next));
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

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!roomId || !last || lastReadSentRef.current === `${roomId}:${last.id}`) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastReadSentRef.current = `${roomId}:${last.id}`;
      void api.markRead(roomId, last.id).then(setReads).catch(() => undefined);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [roomId, messages]);

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

  async function openGallery() {
    if (!roomId) {
      return;
    }
    setGalleryOpen(true);
    setGalleryLoading(true);
    try {
      setGallery(await api.gallery(roomId));
    } catch {
      setError('Không tải được bộ sưu tập ảnh.');
    } finally {
      setGalleryLoading(false);
    }
  }

  function handleAddFiles(files: File[]) {
    setPendingImages((current) => addPendingFiles(current, files));
  }

  async function addToGallery(files: File[]) {
    if (!roomId) {
      return;
    }
    setGalleryLoading(true);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of files) {
        uploaded.push(await api.uploadImage(roomId, file));
      }
      setGallery((current) => [...uploaded, ...current]);
    } catch {
      setError('Không thêm được ảnh vào bộ sưu tập.');
    } finally {
      setGalleryLoading(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const files = filesFromClipboard(event);
    if (!files.length) {
      return;
    }
    event.preventDefault();
    handleAddFiles(files);
  }

  async function sendContent(raw: string) {
    if (!roomId) {
      return;
    }
    const content = raw.trim();
    const attachments = pendingImages;
    if (!content && attachments.length === 0) {
      return;
    }
    const now = Date.now();
    const fingerprint = `${content}|${attachments.map((item) => item.imageId || item.key).join(',')}`;
    if (lastSentRef.current.text === fingerprint && now - lastSentRef.current.at < 800) {
      return;
    }
    lastSentRef.current = { at: now, text: fingerprint };
    setDraft('');
    setPendingImages([]);
    setError('');
    try {
      const uploaded: { imageId?: string; caption: string }[] = [];
      for (const [index, item] of attachments.entries()) {
        const caption = index === attachments.length - 1 ? content : '';
        if (item.imageId) {
          uploaded.push({ imageId: item.imageId, caption });
          continue;
        }
        if (item.file) {
          const image = await api.uploadImage(roomId, item.file);
          uploaded.push({ imageId: image.id, caption });
        }
      }
      if (!uploaded.length) {
        const message = await api.sendMessage(roomId, content);
        appendMessage(message);
        return;
      }
      for (const item of uploaded) {
        const message = await api.sendMessage(roomId, item.caption, item.imageId);
        appendMessage(message);
      }
      revokePending(attachments);
    } catch {
      setDraft(content);
      setPendingImages(attachments);
      setError('Gửi tin thất bại.');
    }
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
  }

  function shouldSkipSend(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return true;
    }
    if (mentionMeasuringRef.current || mentionOpen(draft)) {
      return true;
    }
    return false;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendContent(draft);
  }

  function handlePressEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.shiftKey || shouldSkipSend(event)) {
      return;
    }
    event.preventDefault();
    void sendContent(event.currentTarget.value);
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (shouldSkipSend(event)) {
        return;
      }
      event.preventDefault();
    }
  }

  const canSend = Boolean(roomId && (draft.trim() || pendingImages.length));

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
          <button
            type="button"
            className="profile-avatar-btn"
            title="Thông tin cá nhân"
            onClick={() => setProfileOpen(true)}
          >
            <Avatar style={{ background: '#00a400' }}>{initials(user.name)}</Avatar>
          </button>
          <button type="button" className="who profile-who" onClick={() => setProfileOpen(true)}>
            <strong>{user.name}</strong>
            <small>Team {team}</small>
          </button>
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
            const first = index === 0 || !sameAuthor(messages[index - 1], message);
            const tagged = !mine && mentionsUser(message.content, myHandle);
            const viewers = viewersOf(message, messages, reads);
            const lastReaders = lastSeenOn(message.id, reads, user.id);
            const cls = [
              'row',
              mine ? 'mine' : 'theirs',
              agent ? 'agent' : '',
              tagged ? 'tagged' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const hasImage = Boolean(message.imageUrl);
            const hasText = Boolean(message.content.trim());
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
                  <SeenBubble viewers={viewers}>
                    <div
                      className={[
                        'bubble',
                        hasImage ? 'has-image' : '',
                        hasText ? 'has-text' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {hasImage ? (
                        <Image
                          src={fileSrc(message.imageUrl as string)}
                          alt=""
                          className="chat-photo"
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : null}
                      {hasText ? <MentionText text={message.content} myHandle={myHandle} /> : null}
                    </div>
                  </SeenBubble>
                  <SeenAvatars readers={lastReaders} />
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

        <form className="composer" onSubmit={handleSubmit} onPaste={handlePaste}>
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          {membersLoaded && members.length === 0 && mentionOptions.length <= 2 ? (
            <Typography.Text type="warning" style={{ width: '100%' }}>
              Chưa tải được danh sách đồng đội — redeploy BE mới trên Railway rồi tải lại trang.
            </Typography.Text>
          ) : null}
          <PendingPreviews
            items={pendingImages}
            onRemove={(key) =>
              setPendingImages((current) => {
                const removed = current.find((item) => item.key === key);
                if (removed) {
                  revokePending([removed]);
                }
                return current.filter((item) => item.key !== key);
              })
            }
          />
          <div className="composer-row">
            <ComposerActions
              disabled={!roomId}
              onAddFiles={handleAddFiles}
              onOpenGallery={() => void openGallery()}
            />
            <Mentions
              value={draft}
              onChange={setDraft}
              onSearch={() => {
                mentionMeasuringRef.current = true;
              }}
              onSelect={() => {
                mentionMeasuringRef.current = false;
              }}
              onBlur={() => {
                mentionMeasuringRef.current = false;
              }}
              onPressEnter={handlePressEnter}
              onKeyDown={handleKey}
              autoSize={{ minRows: 2, maxRows: 5 }}
              options={mentionOptions}
              prefix="@"
              placement="top"
              getPopupContainer={() => document.body}
              styles={{ popup: { zIndex: 2000 } }}
              placeholder={
                room
                  ? `Nhắn ${room.name} · Ctrl+V ảnh · @${room.agentName}`
                  : 'Chọn phòng'
              }
              disabled={!roomId}
              notFoundContent="Không có người khớp"
            />
            <Button
              type="primary"
              shape="circle"
              size="large"
              className="composer-send"
              htmlType="button"
              icon={<SendOutlined />}
              disabled={!canSend}
              onClick={() => void sendContent(draft)}
            />
          </div>
        </form>
      </main>

      <GalleryModal
        open={galleryOpen}
        loading={galleryLoading}
        images={gallery}
        onClose={() => setGalleryOpen(false)}
        onPick={(image) => {
          setPendingImages((current) => addGalleryPick(current, image));
          setGalleryOpen(false);
        }}
        onAddFiles={(files) => void addToGallery(files)}
      />
      <ProfileDrawer
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onUpdated={onUserUpdate}
      />
    </div>
  );
}
