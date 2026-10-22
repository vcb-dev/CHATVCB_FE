import { message as antMessage } from 'antd';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { api } from '@/api/client';
import type {
  ChatMessage,
  PageMeta,
  PresenceUser,
  Room,
  RoomMember,
  RoomRead,
  User,
} from '@/types';
import { isDirectRoom, previewOf, upsertRoom } from '../utils/rooms';
import type { Workspace } from './useWorkspace';

const MAX_JUMP_PAGES = 10;

function flashMessage(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 2600);
}

export function useChatRoom({
  user,
  roomId,
  roomIdRef,
  workspace,
  setRoomId,
  setRooms,
  isViewingChat,
  setError,
}: {
  user: User;
  roomId: string;
  roomIdRef: RefObject<string>;
  workspace: Workspace;
  setRoomId: Dispatch<SetStateAction<string>>;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  isViewingChat: () => boolean;
  setError: (error: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reads, setReads] = useState<RoomRead[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<PresenceUser[]>([]);
  const [pending, setPending] = useState(false);
  const [pageMeta, setPageMeta] = useState<PageMeta>({ hasMore: false, nextCursor: null });
  const pageMetaRef = useRef<PageMeta>({ hasMore: false, nextCursor: null });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string>('');
  const lastRoomIdRef = useRef<string>('');
  const pendingJumpRef = useRef<{ id: string; createdAt?: string } | null>(null);
  const lastReadSentRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);
  const userRef = useRef(user);
  messagesRef.current = messages;
  userRef.current = user;
  loadingOlderRef.current = loadingOlder;

  const markMessageRead = useCallback(
    (message?: ChatMessage, targetRoomId?: string) => {
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
    },
    [roomIdRef, setRooms],
  );

  useEffect(() => {
    if (!roomId) {
      return;
    }
    let cancelled = false;
    setPending(false);
    setMembersLoaded(false);
    setReads([]);
    setOnline([]);
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
  }, [workspace, isViewingChat, markMessageRead]);

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

  return {
    messages,
    setMessages,
    reads,
    setReads,
    members,
    setMembers,
    membersLoaded,
    pins,
    setPins,
    online,
    setOnline,
    pending,
    setPending,
    loadingOlder,
    listRef,
    loadOlder,
    markMessageRead,
    jumpToMessage,
    openMessage,
    appendMessage,
    handleForwarded,
  };
}
