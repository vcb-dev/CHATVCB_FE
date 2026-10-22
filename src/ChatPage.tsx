import {
  CameraOutlined,
  CloseOutlined,
  LogoutOutlined,
  FileTextOutlined,
  MailOutlined,
  MessageOutlined,
  PlusOutlined,
  PushpinOutlined,
  RobotOutlined,
  SearchOutlined,
  SendOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Dropdown, Input, Mentions, Modal, Popover, Spin, Typography, message as antMessage } from 'antd';
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { api, fileSrc } from './api';
import {
  addGalleryPick,
  addPendingFiles,
  compressImage,
  ComposerActions,
  filesFromClipboard,
  GalleryModal,
  mergePhotos,
  PendingPreviews,
  photosFromMessages,
  revokePending,
} from './media';
import { isStickerText, StickerButton } from './stickers';
import { ReactionPicker, ReactionSummary } from './reactions';
import { AttachButton, FileCard, PendingFiles, addPendingDocs } from './attachments';
import {
  buildMentionOptions,
  handleFromEmail,
  MentionText,
  mentionOpen,
  mentionsUser,
} from './mentions';
import { lastSeenOn, SeenAvatars, SeenBubble, viewersOf } from './seen';
import { isChatVisible, notifyIncoming, requestNotifyPermission, restoreTitle } from './notify';
import { GroupDrawer } from './GroupDrawer';
import { DocsPage } from './DocsPage';
import { EmailPage } from './EmailPage';
import { MeetingsPage } from './MeetingsPage';
import { ProfileDrawer } from './ProfileDrawer';
import { UserProfileModal } from './UserProfileModal';
import { NewChatModal } from './NewChatModal';
import { ForwardModal } from './ForwardModal';
import { canForward } from './forward';
import {
  countOnlineMembers,
  hasOnlineMember,
  isOtherRoomOnline,
  isOtherUserOnline,
  peerUserIdOf,
  type Presence,
} from './presence';
import { RoomListItem } from './RoomListItem';
import { SidebarSearch } from './SidebarSearch';
import { isDirectRoom, mergeRooms, previewOf, sortRooms, upsertRoom } from './rooms';
import { copyImage, copyText } from './clipboard';
import { CopyableImage } from './CopyableImage';
import { connectSocket } from './socket';
import { avatarColor, initials } from './theme';
import type {
  AgentPendingEvent,
  ChatMessage,
  GalleryImage,
  PageMeta,
  PendingFile,
  PendingImage,
  PresenceUser,
  Room,
  RoomMember,
  RoomRead,
  RoomReadsEvent,
  User,
} from './types';

type Workspace = 'messenger' | 'email' | 'docs' | 'meetings';

const WORKSPACE_IDS: Workspace[] = ['messenger', 'email', 'docs', 'meetings'];
const MAX_JUMP_PAGES = 10;

function asWorkspace(value?: string | null): Workspace | null {
  return value && WORKSPACE_IDS.includes(value as Workspace) ? (value as Workspace) : null;
}

type Props = {
  user: User;
  onLogout: () => void;
  onUserUpdate: (payload: { token: string; user: User }) => void;
};

const WORKSPACES: { id: Workspace; label: string; icon: typeof MessageOutlined }[] = [
  { id: 'messenger', label: 'Messenger', icon: MessageOutlined },
  { id: 'email', label: 'Email', icon: MailOutlined },
  { id: 'docs', label: 'Docs', icon: FileTextOutlined },
  { id: 'meetings', label: 'Cuộc họp', icon: VideoCameraOutlined },
];

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOverlay, setGroupOverlay] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    return (
      asWorkspace(new URLSearchParams(window.location.search).get('workspace')) ||
      asWorkspace(localStorage.getItem('chatvcb.workspace')) ||
      'messenger'
    );
  });
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [roomsMeta, setRoomsMeta] = useState<PageMeta>({ hasMore: false, nextCursor: null });
  const [loadingOlderRooms, setLoadingOlderRooms] = useState(false);
  const roomsMetaRef = useRef<PageMeta>({ hasMore: false, nextCursor: null });
  const hasLoadedMoreRoomsRef = useRef(false);
  const [pageMeta, setPageMeta] = useState<PageMeta>({ hasMore: false, nextCursor: null });
  const pageMetaRef = useRef<PageMeta>({ hasMore: false, nextCursor: null });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const myAvatarRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef('');
  const lastMessageIdRef = useRef<string>('');
  const lastRoomIdRef = useRef<string>('');
  const pendingJumpRef = useRef<{ id: string; createdAt?: string } | null>(null);
  const mentionMeasuringRef = useRef(false);
  const lastSentRef = useRef<{ at: number; text: string }>({ at: 0, text: '' });
  const lastReadSentRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const pendingFilesRef = useRef<PendingFile[]>([]);
  const userRef = useRef(user);
  const workspaceRef = useRef(workspace);
  const roomNameRef = useRef('');
  const myHandle = handleFromEmail(user.email);
  const myHandleRef = useRef(myHandle);
  pendingImagesRef.current = pendingImages;
  pendingFilesRef.current = pendingFiles;
  messagesRef.current = messages;
  userRef.current = user;
  workspaceRef.current = workspace;
  myHandleRef.current = myHandle;
  loadingOlderRef.current = loadingOlder;

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );
  const isDirect = Boolean(room && isDirectRoom(room));
  const presence: Presence = { myId: user.id, online, onlineUserIds };
  const isPeerOnline = isOtherUserOnline(presence, peerUserIdOf(room, members, user.id));
  const isGroupOnline = hasOnlineMember(presence, members);
  const onlineMembersCount = countOnlineMembers(presence, members);

  function isRoomOnline(item: Room) {
    if (item.id !== roomId) {
      return isOtherRoomOnline(presence, item);
    }
    return isDirect ? isPeerOnline : isGroupOnline;
  }

  const team = user.team ?? room?.team ?? 'sale';
  roomNameRef.current = room ? (room.title || room.name) : '';
  const mentionOptions = useMemo(
    () => buildMentionOptions(members, online, user.id, room),
    [members, online, room, user.id],
  );
  const headerPins = useMemo(
    () => pins.filter((item) => item.pinned && !item.recalled),
    [pins],
  );
  const chatPhotos = useMemo(() => photosFromMessages(messages), [messages]);
  const latestPin = headerPins[0];

  function pinPreview(item: ChatMessage) {
    if (item.recalled) {
      return 'Tin nhắn đã được thu hồi';
    }
    return (
      item.content.trim() ||
      (item.fileName ? `[Tệp] ${item.fileName}` : '') ||
      (item.imageUrl ? '[Ảnh]' : 'Tin đã ghim')
    );
  }

  useEffect(() => {
    void api
      .me()
      .then((next) => {
        const token = localStorage.getItem('chatvcb.token');
        if (token) {
          onUserUpdate({ token, user: { ...userRef.current, ...next } });
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMyAvatar(file: File) {
    const preview = URL.createObjectURL(file);
    onUserUpdate({
      token: localStorage.getItem('chatvcb.token') || '',
      user: { ...userRef.current, avatarUrl: preview },
    });
    try {
      onUserUpdate(await api.uploadMyAvatar(await compressImage(file, 400)));
      antMessage.success('Đã đổi ảnh đại diện.');
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không đổi được ảnh.');
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  async function sendSticker(emoji: string) {
    if (!roomId) {
      return;
    }
    try {
      appendMessage(await api.sendMessage(roomId, emoji, undefined, replyTo?.id));
      setReplyTo(null);
    } catch {
      setError('Gửi sticker thất bại.');
    }
  }

  async function sendGif(url: string) {
    if (!roomId) {
      return;
    }
    try {
      const image = await api.attachRemoteImage(roomId, url);
      appendMessage(await api.sendMessage(roomId, '', image.id, replyTo?.id));
      setReplyTo(null);
    } catch {
      setError('Gửi GIF thất bại.');
    }
  }

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
    localStorage.setItem('chatvcb.workspace', workspace);
  }, [workspace]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('workspace') && !params.get('mail')) {
      return;
    }
    window.history.replaceState({}, '', window.location.pathname || '/');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshRooms() {
      try {
        const page = await api.rooms();
        if (cancelled) {
          return;
        }
        const viewing = isViewingChat();
        setRooms((prev) => {
          const merged = mergeRooms(
            prev,
            page.data,
            roomIdRef.current,
            page.meta.hasMore,
            viewing,
          );
          if (roomIdRef.current && !merged.some((r) => r.id === roomIdRef.current)) {
            setRoomId(merged[0]?.id ?? '');
          }
          return merged;
        });
        if (!hasLoadedMoreRoomsRef.current || !page.meta.hasMore) {
          if (!page.meta.hasMore) {
            hasLoadedMoreRoomsRef.current = false;
          }
          setRoomsMeta(page.meta);
          roomsMetaRef.current = page.meta;
        }
      } catch {
        // ignore polling errors
      }
    }

    api
      .rooms()
      .then((page) => {
        if (cancelled) {
          return;
        }
        const viewing = isViewingChat();
        setRooms((prev) =>
          mergeRooms(prev, page.data, roomIdRef.current, page.meta.hasMore, viewing),
        );
        setRoomsMeta(page.meta);
        roomsMetaRef.current = page.meta;
        setRoomId((current) => current || page.data[0]?.id || '');
      })
      .catch(() => setError('Không tải được danh sách phòng.'));

    const interval = window.setInterval(() => {
      void refreshRooms();
    }, 10_000);

    const onFocus = () => void refreshRooms();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
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
    setOnline([]);
    revokePending(pendingImagesRef.current);
    setPendingImages([]);
    setPendingFiles([]);
    setGalleryOpen(false);
    setReplyTo(null);
    setPins([]);
    setPageMeta({ hasMore: false, nextCursor: null });
    pageMetaRef.current = { hasMore: false, nextCursor: null };
    setLoadingOlder(false);
    api
      .pins(roomId)
      .then((next) => {
        if (!cancelled) {
          setPins(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPins([]);
        }
      });
    api
      .messages(roomId)
      .then((page) => {
        if (!cancelled) {
          setMessages(page.data);
          setPageMeta(page.meta);
          pageMetaRef.current = page.meta;
          const latest = page.data[page.data.length - 1];
          if (!latest) {
            setRooms((current) =>
              current.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
            );
          } else if (isViewingChat()) {
            markMessageRead(latest, roomId);
          }
          if (pendingJumpRef.current) {
            const target = pendingJumpRef.current;
            pendingJumpRef.current = null;
            requestAnimationFrame(() => {
              void jumpToMessage(target.id, target.createdAt);
            });
          }
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
      socket.emit('presence.get');
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
        void antMessage.info({
          className: 'mention-alert',
          content: `${message.authorName} đã tag bạn`,
        });
      }
      const viewing = message.roomId === roomIdRef.current && isViewingChat();
      if (!mine) {
        notifyIncoming({
          title: message.authorName,
          subtitle: roomNameRef.current,
          body:
            message.content.trim() ||
            (message.fileName ? `[Tệp] ${message.fileName}` : '') ||
            (message.imageUrl ? 'Đã gửi một ảnh' : 'Tin nhắn mới'),
          mentioned: tagged,
        });
        if (viewing) {
          markMessageRead(message, message.roomId);
        }
      }
      setRooms((current) => {
        const target = current.find((r) => r.id === message.roomId);
        if (!target) {
          return current;
        }
        const updated: Room = {
          ...target,
          lastMessagePreview: previewOf(message, userRef.current?.id, isDirectRoom(target)),
          updatedAt: message.createdAt,
          unreadCount: viewing ? 0 : target.unreadCount + (mine ? 0 : 1),
        };
        return upsertRoom(current, updated);
      });
    });
    socket.on('agent.pending', (payload: AgentPendingEvent) => {
      if (payload.roomId === roomIdRef.current) {
        setPending(true);
      }
    });
    socket.on('presence.online', (users: PresenceUser[]) => {
      setOnlineUserIds(new Set(users.map((u) => u.id)));
    });
    socket.on('room.presence', (users: PresenceUser[]) => {
      setOnline(users);
      setOnlineUserIds((current) => {
        const next = new Set(current);
        for (const u of users) {
          next.add(u.id);
        }
        return next;
      });
    });
    socket.on('room.reads', (payload: RoomReadsEvent) => {
      if (payload.roomId !== roomIdRef.current) {
        return;
      }
      setReads(payload.reads);
    });
    socket.on('message.updated', (message: ChatMessage) => {
      setMessages((current) =>
        current.map((item) => {
          if (item.id === message.id) {
            return message;
          }
          if (item.replyTo?.id === message.id) {
            return {
              ...item,
              replyTo: {
                id: message.id,
                authorName: message.authorName,
                content: message.content,
                imageUrl: message.imageUrl,
                recalled: message.recalled,
              },
            };
          }
          return item;
        }),
      );
      if (message.roomId === roomIdRef.current) {
        setPins((current) => {
          if (message.pinned && !message.recalled) {
            return [message, ...current.filter((item) => item.id !== message.id)];
          }
          return current.filter((item) => item.id !== message.id);
        });
      }
    });
    socket.on('room.updated', (next: Room) => {
      setRooms((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)));
    });
    socket.on('room.members', () => {
      const targetRoomId = roomIdRef.current;
      if (!targetRoomId) {
        return;
      }
      void api
        .members(targetRoomId)
        .then((next) => {
          if (roomIdRef.current !== targetRoomId) {
            return;
          }
          setMembers(next);
          const names = new Map(next.map((item) => [item.id, item.displayName || item.name]));
          setMessages((current) =>
            current.map((item) => {
              if (!item.userId) {
                return item;
              }
              const name = names.get(item.userId);
              return name && name !== item.authorName ? { ...item, authorName: name } : item;
            }),
          );
        })
        .catch(() => {
          // làm mới nền; lỗi mạng thì giữ danh sách cũ
        });
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
    setGroupOverlay(false);
    if (roomId) {
      socketRef.current?.emit('join', roomId);
    }
  }, [roomId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    const latestId = messages[messages.length - 1]?.id ?? '';
    const roomChanged = lastRoomIdRef.current !== roomId;
    const latestChanged = lastMessageIdRef.current !== latestId;

    if (roomChanged || latestChanged || pending) {
      el.scrollTop = el.scrollHeight;
      lastRoomIdRef.current = roomId;
      lastMessageIdRef.current = latestId;
    }
  }, [messages, pending, roomId]);

  async function loadOlder() {
    if (!roomId || loadingOlder || !pageMeta.hasMore || !pageMeta.nextCursor) {
      return;
    }
    const el = listRef.current;
    if (!el) {
      return;
    }
    const startRoom = roomId;
    setLoadingOlder(true);
    const prevScrollHeight = el.scrollHeight;
    try {
      const page = await api.messages(startRoom, pageMeta.nextCursor);
      if (roomIdRef.current !== startRoom) {
        return;
      }
      setPageMeta(page.meta);
      pageMetaRef.current = page.meta;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const older = page.data.filter((m) => !existingIds.has(m.id));
        return [...older, ...prev];
      });
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop += el.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      // ignore loading errors
    } finally {
      if (roomIdRef.current === startRoom) {
        setLoadingOlder(false);
      }
    }
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }
    let cancelled = false;
    const refresh = () => {
      void api.reads(roomId).then((next) => {
        if (!cancelled) {
          setReads(next);
        }
      }).catch(() => undefined);
    };
    const timer = window.setInterval(refresh, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  function isViewingChat() {
    return workspaceRef.current === 'messenger' && isChatVisible();
  }

  function markMessageRead(message?: ChatMessage, targetRoomId?: string) {
    const rid = targetRoomId || roomIdRef.current;
    if (!rid) {
      return;
    }
    const latest = message ?? messagesRef.current[messagesRef.current.length - 1];
    if (!latest) {
      return;
    }
    const key = `${rid}:${latest.id}`;
    if (lastReadSentRef.current === key) {
      return;
    }
    lastReadSentRef.current = key;
    void api
      .markRead(rid, latest.id)
      .then((readsRes) => {
        if (roomIdRef.current === rid) {
          setReads(readsRes);
        }
        setRooms((current) =>
          current.map((r) => (r.id === rid ? { ...r, unreadCount: 0 } : r)),
        );
      })
      .catch(() => {
        lastReadSentRef.current = '';
      });
  }

  useEffect(() => {
    function markReadWhenViewing() {
      if (isViewingChat()) {
        markMessageRead();
      }
    }
    markReadWhenViewing();
    window.addEventListener('focus', markReadWhenViewing);
    document.addEventListener('visibilitychange', markReadWhenViewing);
    return () => {
      window.removeEventListener('focus', markReadWhenViewing);
      document.removeEventListener('visibilitychange', markReadWhenViewing);
    };
  }, [workspace]);

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
      setGallery(mergePhotos(photosFromMessages(messages), await api.gallery(roomId)));
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

  function handleAddPendingDocs(files: File[]) {
    const { next, error } = addPendingDocs(pendingFiles, files);
    if (error) {
      antMessage.error(error);
    }
    setPendingFiles(next);
  }

  async function sendContent(raw: string) {
    if (!roomId) {
      return;
    }
    const content = raw.trim();
    const attachments = pendingImages;
    const filesToSend = pendingFiles;
    if (!content && attachments.length === 0 && filesToSend.length === 0) {
      return;
    }
    const now = Date.now();
    const imageKeys = attachments.map((item) => item.imageId || item.key).join(',');
    const fileKeys = filesToSend.map((item) => item.key).join(',');
    const fingerprint = `${content}|img:${imageKeys}|file:${fileKeys}`;
    if (lastSentRef.current.text === fingerprint && now - lastSentRef.current.at < 800) {
      return;
    }
    lastSentRef.current = { at: now, text: fingerprint };
    const replyId = replyTo?.id;
    setDraft('');
    setPendingImages([]);
    setPendingFiles([]);
    setReplyTo(null);
    setError('');
    const unsentFiles = [...filesToSend];
    try {
      const uploadedImages: { imageId?: string; caption: string }[] = [];
      for (const [index, item] of attachments.entries()) {
        const isLastOverall = filesToSend.length === 0 && index === attachments.length - 1;
        const caption = isLastOverall ? content : '';
        if (item.imageId) {
          uploadedImages.push({ imageId: item.imageId, caption });
          continue;
        }
        if (item.file) {
          const image = await api.uploadImage(roomId, item.file);
          uploadedImages.push({ imageId: image.id, caption });
        }
      }
      for (const [index, item] of uploadedImages.entries()) {
        const isLastOverall = filesToSend.length === 0 && index === uploadedImages.length - 1;
        const message = await api.sendMessage(
          roomId,
          item.caption,
          item.imageId,
          isLastOverall ? replyId : undefined,
        );
        appendMessage(message);
      }
      revokePending(attachments);

      for (const [index, fileItem] of filesToSend.entries()) {
        const uploadedDoc = await api.uploadFile(roomId, fileItem.file);
        const isLastOverall = index === filesToSend.length - 1;
        const caption = isLastOverall ? content : '';
        const reply = isLastOverall ? replyId : undefined;
        const message = await api.sendMessage(
          roomId,
          caption,
          undefined,
          reply,
          uploadedDoc.id,
        );
        appendMessage(message);
        unsentFiles.shift();
      }

      if (attachments.length === 0 && filesToSend.length === 0) {
        const message = await api.sendMessage(roomId, content, undefined, replyId);
        appendMessage(message);
      }
    } catch (err) {
      setDraft(content);
      setPendingImages(attachments);
      setPendingFiles(unsentFiles);
      setError('Gửi tin thất bại.');
      antMessage.error(err instanceof Error ? err.message : 'Gửi tin thất bại.');
    }
  }

  function flashMessage(el: HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    window.setTimeout(() => el.classList.remove('flash'), 1400);
  }

  async function jumpToMessage(id: string, createdAt?: string) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      flashMessage(el);
      return;
    }
    if (loadingOlderRef.current) {
      antMessage.info('Đang tải tin cũ, thử lại sau giây lát.');
      return;
    }
    const startRoom = roomIdRef.current;
    let meta = pageMetaRef.current;
    const older: ChatMessage[] = [];
    let found = false;
    let pages = 0;
    const hide = antMessage.loading('Đang tìm tin nhắn…', 0);
    setLoadingOlder(true);
    try {
      while (!found && meta.hasMore && meta.nextCursor && pages < MAX_JUMP_PAGES) {
        if (createdAt && new Date(meta.nextCursor) <= new Date(createdAt)) {
          break;
        }
        const page = await api.messages(startRoom, meta.nextCursor);
        if (roomIdRef.current !== startRoom) {
          return;
        }
        older.unshift(...page.data);
        meta = page.meta;
        pages += 1;
        found = page.data.some((m) => m.id === id);
      }
    } catch {
      antMessage.error('Không tải được tin nhắn cũ.');
      return;
    } finally {
      hide();
      if (roomIdRef.current === startRoom) {
        setLoadingOlder(false);
      }
    }
    if (pages > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !existingIds.has(m.id)), ...prev];
      });
      setPageMeta(meta);
      pageMetaRef.current = meta;
    }
    if (found) {
      requestAnimationFrame(() => {
        const target = document.getElementById(`msg-${id}`);
        if (target) {
          flashMessage(target);
        }
      });
    } else if (pages === MAX_JUMP_PAGES) {
      antMessage.info('Tin nhắn nằm quá xa, hãy cuộn lên để xem thêm.');
    } else {
      antMessage.info('Không tìm thấy tin nhắn (có thể đã bị xóa).');
    }
  }

  function openMessage(targetRoomId: string, messageId: string, createdAt?: string) {
    if (roomId !== targetRoomId) {
      pendingJumpRef.current = { id: messageId, createdAt };
      setRoomId(targetRoomId);
    } else {
      void jumpToMessage(messageId, createdAt);
    }
  }

  async function handleMessageAction(key: string, message: ChatMessage) {
    if (!roomId) {
      return;
    }
    if (key === 'reply') {
      setReplyTo(message);
      return;
    }
    if (key === 'forward') {
      setForwarding(message);
      return;
    }
    if (key === 'copy' || key === 'copyImage') {
      try {
        if (key === 'copy') {
          await copyText(message.content);
        } else if (message.imageUrl) {
          await copyImage(fileSrc(message.imageUrl));
        }
        antMessage.success('Đã sao chép.');
      } catch {
        antMessage.error(
          key === 'copy'
            ? 'Không sao chép được tin nhắn.'
            : 'Không sao chép được ảnh.',
        );
      }
      return;
    }
    try {
      if (key === 'pin') {
        const next = await api.pinMessage(roomId, message.id, !message.pinned);
        setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
        setPins((current) => {
          if (next.pinned && !next.recalled) {
            return [next, ...current.filter((item) => item.id !== next.id)];
          }
          return current.filter((item) => item.id !== next.id);
        });
        return;
      }
      if (key === 'delete') {
        Modal.confirm({
          title: 'Xóa tin nhắn?',
          content: 'Chỉ xóa với bạn. Người khác vẫn thấy tin này.',
          okText: 'Xóa',
          okButtonProps: { danger: true },
          onOk: async () => {
            await api.deleteMessage(roomId, message.id);
            setMessages((current) => current.filter((item) => item.id !== message.id));
          },
        });
        return;
      }
      if (key === 'recall') {
        Modal.confirm({
          title: 'Thu hồi tin nhắn?',
          content: 'Mọi người trong nhóm sẽ không còn thấy nội dung.',
          okText: 'Thu hồi',
          okButtonProps: { danger: true },
          onOk: async () => {
            const next = await api.recallMessage(roomId, message.id);
            setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
          },
        });
      }
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
    }
  }

  async function handleReact(message: ChatMessage, emoji: string) {
    if (!roomId) {
      return;
    }
    try {
      const next = await api.reactMessage(roomId, message.id, emoji);
      setMessages((current) => current.map((item) => (item.id === next.id ? next : item)));
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không thả được cảm xúc.');
    }
  }

  function openRoom(nextRoom: Room) {
    setRooms((prev) => upsertRoom(prev, nextRoom));
    setRoomId(nextRoom.id);
  }

  function selectRoom(next: Room) {
    setRoomId(next.id);
    setRooms((current) =>
      current.map((r) => (r.id === next.id ? { ...r, unreadCount: 0 } : r)),
    );
  }

  async function loadMoreRooms() {
    if (loadingOlderRooms || !roomsMetaRef.current.hasMore || !roomsMetaRef.current.nextCursor) {
      return;
    }
    setLoadingOlderRooms(true);
    hasLoadedMoreRoomsRef.current = true;
    try {
      const page = await api.rooms(roomsMetaRef.current.nextCursor);
      setRooms((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newRooms = page.data.filter((r) => !existingIds.has(r.id));
        return sortRooms([...prev, ...newRooms]);
      });
      setRoomsMeta(page.meta);
      roomsMetaRef.current = page.meta;
    } catch (err) {
      antMessage.error(
        err instanceof Error ? err.message : 'Không tải thêm được danh sách phòng.',
      );
    } finally {
      setLoadingOlderRooms(false);
    }
  }

  function handleRoomsScroll(e: React.UIEvent<HTMLDivElement>) {
    if (searchText.trim() || loadingOlderRooms || !roomsMeta.hasMore || !roomsMeta.nextCursor) {
      return;
    }
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom < 80) {
      void loadMoreRooms();
    }
  }

  function handleRoomRemoved(removedRoomId: string) {
    setRooms((prev) => {
      const next = prev.filter((item) => item.id !== removedRoomId);
      if (roomIdRef.current === removedRoomId) {
        setRoomId(next[0]?.id ?? '');
      }
      return next;
    });
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
    setRooms((current) => {
      const target = current.find((r) => r.id === (message.roomId || roomIdRef.current));
      if (!target) {
        return current;
      }
      const updated: Room = {
        ...target,
        lastMessagePreview: previewOf(message, userRef.current?.id, isDirectRoom(target)),
        updatedAt: message.createdAt,
      };
      return upsertRoom(current, updated);
    });
    markMessageRead(message);
  }

  function handleForwarded(sent: ChatMessage) {
    if (sent.roomId === roomIdRef.current) {
      appendMessage(sent);
      return;
    }
    setRooms((current) => {
      const target = current.find((r) => r.id === sent.roomId);
      if (!target) {
        return current;
      }
      return upsertRoom(current, {
        ...target,
        lastMessagePreview: previewOf(sent, userRef.current.id, isDirectRoom(target)),
        updatedAt: sent.createdAt,
      });
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

  const canSend = Boolean(
    roomId && (draft.trim() || pendingImages.length || pendingFiles.length),
  );

  return (
    <div className={`app-shell module-${workspace}`}>
      <nav className="nav-rail">
        <div className="nav-rail-brand">C</div>
        <div className="nav-rail-items">
          {WORKSPACES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={workspace === item.id ? 'nav-rail-btn active' : 'nav-rail-btn'}
                onClick={() => {
                  setWorkspace(item.id);
                  setGroupOverlay(false);
                }}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="nav-rail-foot">
          <button
            type="button"
            className="nav-rail-avatar"
            title={user.name}
            onClick={() => setProfileOpen(true)}
          >
            <Avatar
              size={36}
              src={user.avatarUrl ? fileSrc(user.avatarUrl) : undefined}
              style={{ background: avatarColor(user.name), color: '#fff', fontWeight: 700 }}
            >
              {initials(user.name)}
            </Avatar>
          </button>
          <button type="button" className="nav-rail-btn logout" title="Thoát" onClick={onLogout}>
            <LogoutOutlined />
            <span>Thoát</span>
          </button>
        </div>
      </nav>

      {workspace === 'messenger' ? (
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
            onClick={() => setNewChatOpen(true)}
          />
        </div>
        <div className="sidebar-search-box">
          <Input
            prefix={<SearchOutlined style={{ color: '#8a8d91' }} />}
            placeholder="Tìm người, nhóm, tin nhắn"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        {searchText.trim() ? (
          <SidebarSearch
            query={searchText}
            onClose={() => setSearchText('')}
            onOpenRoom={openRoom}
            onOpenMessage={openMessage}
            rooms={rooms}
          />
        ) : (
        <div className="room-list" onScroll={handleRoomsScroll}>
          {rooms.map((item) => (
            <RoomListItem
              key={item.id}
              room={item}
              active={item.id === roomId}
              online={isRoomOnline(item)}
              onSelect={selectRoom}
            />
          ))}
          {loadingOlderRooms ? (
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
                void handleMyAvatar(file);
              }
            }}
          />
          <button type="button" className="who profile-who" onClick={() => setProfileOpen(true)}>
            <strong>{user.name}</strong>
            <small>Team {team}</small>
          </button>
        </div>
      </aside>
      ) : null}

      {workspace === 'messenger' ? (
      <main className="chat">
        <header className="chat-head">
          <button
            type="button"
            className="chat-head-info"
            disabled={!room}
            onClick={() => {
              if (window.matchMedia('(max-width: 1100px)').matches) {
                setGroupOverlay((current) => !current);
              }
            }}
          >
            <Badge
              dot={isDirect ? isPeerOnline : isGroupOnline}
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
                    {members.length
                      ? `${members.length} thành viên`
                      : 'Gõ @ để tag đồng đội'}
                    {members.length && onlineMembersCount > 0
                      ? ` · Online ${onlineMembersCount}`
                      : ''}
                  </>
                )}
              </small>
            </div>
          </button>
        </header>
        {latestPin ? (
          <div className="pin-bar">
            <button type="button" className="pin-bar-main" onClick={() => void jumpToMessage(latestPin.id, latestPin.createdAt)}>
              <PushpinOutlined />
              <span>
                <strong>{latestPin.authorName}</strong>
                {pinPreview(latestPin)}
              </span>
            </button>
            {headerPins.length > 1 ? (
              <Popover
                trigger="click"
                placement="bottomRight"
                title={`${headerPins.length} tin đã ghim`}
                content={
                  <div className="pin-bar-list">
                    {headerPins.map((item) => (
                      <button key={item.id} type="button" onClick={() => void jumpToMessage(item.id, item.createdAt)}>
                        <strong>{item.authorName}</strong>
                        <small>{pinPreview(item)}</small>
                      </button>
                    ))}
                  </div>
                }
              >
                <button type="button" className="pin-bar-count">
                  {headerPins.length}
                </button>
              </Popover>
            ) : null}
          </div>
        ) : null}

        <div
          className="messages"
          ref={listRef}
          onScroll={(e) => {
            if (e.currentTarget.scrollTop < 40) {
              void loadOlder();
            }
          }}
        >
          {loadingOlder ? (
            <div className="messages-loading">Đang tải tin cũ…</div>
          ) : null}
          {messages.map((message, index) => {
            const mine = message.userId === user.id;
            const agent = message.role === 'agent';
            const first = index === 0 || !sameAuthor(messages[index - 1], message);
            const last =
              index === messages.length - 1 || !sameAuthor(message, messages[index + 1]);
            const tagged = !mine && mentionsUser(message.content, myHandle);
            const viewers = viewersOf(message, messages, reads);
            const lastReaders = lastSeenOn(message, messages, reads, user.id);
            const cls = [
              'row',
              mine ? 'mine' : 'theirs',
              agent ? 'agent' : '',
              tagged ? 'tagged' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const hasImage = Boolean(message.imageUrl && !message.recalled);
            const hasFile = Boolean(message.fileUrl && !message.recalled);
            const hasText = Boolean(message.content && !message.recalled);
            const sticker = !hasImage && !hasFile && hasText && isStickerText(message.content);
            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={cls}
                onClick={() => markMessageRead()}
              >
                {!mine && first ? (
                  <Avatar
                    size={28}
                    className="avatar-initials"
                    src={message.authorAvatarUrl ? fileSrc(message.authorAvatarUrl) : undefined}
                    icon={agent ? <RobotOutlined /> : undefined}
                    style={{
                      background: agent ? '#31a24c' : avatarColor(message.authorName),
                      cursor: !agent && message.userId ? 'pointer' : 'default',
                    }}
                    onClick={(e) => {
                      if (!agent && message.userId) {
                        e?.stopPropagation();
                        setViewProfileId(message.userId);
                      }
                    }}
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
                  <div className="bubble-wrap">
                    <Dropdown
                      trigger={['contextMenu']}
                      menu={{
                        items: [
                          {
                            key: 'reply',
                            label: 'Trả lời tin nhắn',
                            disabled: message.recalled,
                          },
                          ...(canForward(message) ? [{ key: 'forward', label: 'Chuyển tiếp' }] : []),
                          ...(hasText ? [{ key: 'copy', label: 'Sao chép tin nhắn' }] : []),
                          ...(hasImage ? [{ key: 'copyImage', label: 'Sao chép ảnh' }] : []),
                          {
                            key: 'pin',
                            label: message.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn',
                            disabled: message.recalled,
                          },
                          { key: 'delete', label: 'Xóa tin nhắn' },
                          ...(mine && !message.recalled
                            ? [{ key: 'recall', label: 'Thu hồi tin nhắn', danger: true }]
                            : []),
                        ],
                        onClick: ({ key }) => void handleMessageAction(key, message),
                      }}
                    >
                      <div className="bubble-hit">
                        <SeenBubble viewers={viewers}>
                          <div
                            className={[
                              'bubble',
                              hasImage ? 'has-image' : '',
                              hasFile ? 'has-file' : '',
                              hasText ? 'has-text' : '',
                              sticker ? 'sticker' : '',
                              message.recalled ? 'recalled' : '',
                              message.pinned ? 'pinned' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {message.replyTo ? (
                              <button
                                type="button"
                                className="reply-quote"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markMessageRead();
                                  void jumpToMessage(message.replyTo!.id);
                                }}
                              >
                                <strong>{message.replyTo.authorName}</strong>
                                <span>
                                  {message.replyTo.recalled
                                    ? 'Tin nhắn đã được thu hồi'
                                    : message.replyTo.content ||
                                      (message.replyTo.fileName
                                        ? `[Tệp] ${message.replyTo.fileName}`
                                        : '') ||
                                      (message.replyTo.imageUrl ? '[Ảnh]' : '')}
                                </span>
                              </button>
                            ) : null}
                            {message.recalled ? (
                              <p className="recalled-text">Tin nhắn đã được thu hồi</p>
                            ) : (
                              <>
                                {hasImage ? (
                                  <CopyableImage
                                    src={fileSrc(message.imageUrl as string)}
                                    alt=""
                                    className="chat-photo"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      markMessageRead();
                                    }}
                                  />
                                ) : null}
                                {hasFile ? (
                                  <FileCard
                                    name={message.fileName || 'Tệp'}
                                    sizeBytes={message.fileSizeBytes}
                                    url={message.fileUrl as string}
                                    mimeType={message.fileMimeType}
                                  />
                                ) : null}
                                {hasText ? (
                                  <MentionText text={message.content} myHandle={myHandle} />
                                ) : null}
                              </>
                            )}
                            {message.pinned && !message.recalled ? (
                              <span className="pin-mark">
                                <PushpinOutlined /> Đã ghim
                              </span>
                            ) : null}
                          </div>
                        </SeenBubble>
                      </div>
                    </Dropdown>
                    {!message.recalled ? (
                      <ReactionPicker
                        onPick={(emoji) => void handleReact(message, emoji)}
                      />
                    ) : null}
                  </div>
                  <ReactionSummary
                    reactions={message.reactions}
                    myId={user.id}
                    onToggle={(emoji) => void handleReact(message, emoji)}
                  />
                  <SeenAvatars readers={lastReaders} />
                  {last ? (
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

        <form
          className="composer"
          onSubmit={handleSubmit}
          onPaste={handlePaste}
          onMouseDown={() => markMessageRead()}
        >
          {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
          {replyTo ? (
            <div className="reply-bar">
              <div>
                <strong>Trả lời {replyTo.authorName}</strong>
                <span>
                  {replyTo.recalled
                    ? 'Tin nhắn đã được thu hồi'
                    : replyTo.content ||
                      (replyTo.fileName ? `[Tệp] ${replyTo.fileName}` : '') ||
                      (replyTo.imageUrl ? '[Ảnh]' : '')}
                </span>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setReplyTo(null)}
              />
            </div>
          ) : null}
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
          <PendingFiles
            items={pendingFiles}
            onRemove={(key) =>
              setPendingFiles((current) => current.filter((item) => item.key !== key))
            }
          />
          <div className="composer-row">
            <ComposerActions
              disabled={!roomId}
              onAddFiles={handleAddFiles}
              onOpenGallery={() => void openGallery()}
            />
            <AttachButton
              disabled={!roomId}
              onAddFiles={handleAddPendingDocs}
            />
            <StickerButton
              disabled={!roomId}
              onEmoji={(emoji) => setDraft((current) => `${current}${emoji}`)}
              onSticker={(emoji) => void sendSticker(emoji)}
              onGif={(url) => void sendGif(url)}
            />
            <Mentions
              value={draft}
              onChange={setDraft}
              onFocus={() => markMessageRead()}
              onClick={() => markMessageRead()}
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
              autoSize={{ minRows: 1, maxRows: 5 }}
              options={mentionOptions}
              prefix="@"
              placement="top"
              getPopupContainer={() => document.body}
              styles={{ popup: { zIndex: 2000 } }}
              placeholder={
                room
                  ? `Nhắn ${room.title || room.name} · Ctrl+V ảnh · @agent`
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
      ) : workspace === 'email' ? (
        <EmailPage />
      ) : workspace === 'docs' ? (
        <DocsPage user={user} />
      ) : (
        <MeetingsPage user={user} />
      )}

      <ForwardModal
        message={forwarding}
        rooms={rooms}
        onClose={() => setForwarding(null)}
        onForwarded={handleForwarded}
      />
      {workspace === 'messenger' ? (
      <GroupDrawer
        room={room}
        members={members}
        currentUserId={user.id}
        chatPhotos={chatPhotos}
        overlay={groupOverlay}
        onClose={() => setGroupOverlay(false)}
        onRoomUpdated={(next) =>
          setRooms((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)))
        }
        onMembersUpdated={setMembers}
        onRoomRemoved={handleRoomRemoved}
        onJumpMessage={jumpToMessage}
        onViewProfile={(uid) => setViewProfileId(uid)}
      />
      ) : null}
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
      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onOpenRoom={openRoom}
      />
      <UserProfileModal
        open={Boolean(viewProfileId)}
        userId={viewProfileId}
        currentUserId={user.id}
        onClose={() => setViewProfileId(null)}
        onOpenRoom={openRoom}
      />
    </div>
  );
}
