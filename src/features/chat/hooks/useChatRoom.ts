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
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
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
import { firstUnreadId } from '../utils/unread';
import { useRoomCacheSetter } from './useRoomCacheSetter';
import type { Workspace } from './useWorkspace';

const MAX_JUMP_PAGES = 10;
const EMPTY_READS: RoomRead[] = [];
const EMPTY_MEMBERS: RoomMember[] = [];
const EMPTY_PINS: ChatMessage[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];

// Giữ các tin đã có sẵn mà trang vừa nạp chưa có và mới hơn tin cuối của trang
function mergeNewer(page: ChatMessage[], existing: ChatMessage[]): ChatMessage[] {
  if (existing.length === 0) {
    return page;
  }
  const lastAt = page.length ? new Date(page[page.length - 1].createdAt).getTime() : 0;
  const known = new Set(page.map((item) => item.id));
  const newer = existing.filter(
    (item) => !known.has(item.id) && new Date(item.createdAt).getTime() > lastAt,
  );
  return newer.length ? [...page, ...newer] : page;
}

function flashMessage(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash');
  window.setTimeout(() => el.classList.remove('flash'), 2600);
}

export function useChatRoom({
  user,
  roomId,
  roomIdRef,
  unreadOnOpenRef,
  workspace,
  setRoomId,
  setRooms,
  isViewingChat,
  setError,
}: {
  user: User;
  roomId: string;
  roomIdRef: RefObject<string>;
  unreadOnOpenRef: RefObject<{ roomId: string; count: number } | null>;
  workspace: Workspace;
  setRoomId: Dispatch<SetStateAction<string>>;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  isViewingChat: () => boolean;
  setError: (error: string) => void;
}) {
  // Tin nhắn gắn với phòng đã nạp chúng: vừa đổi phòng là không còn tin của phòng cũ trên màn hình,
  // không phải chờ phòng mới tải xong.
  const [store, setStore] = useState<{ roomId: string; items: ChatMessage[]; loaded: boolean }>({
    roomId: '',
    items: EMPTY_MESSAGES,
    loaded: false,
  });
  const messagesLoaded = store.roomId === roomId && store.loaded;
  const messages = store.roomId === roomId ? store.items : EMPTY_MESSAGES;
  // Mọi chỗ sửa danh sách tin (socket, sửa, xóa, thả cảm xúc…) đều tác động lên phòng đang mở
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = useCallback(
    (action) => {
      setStore((prev) => {
        const openId = roomIdRef.current;
        const same = prev.roomId === openId;
        const base = same ? prev.items : EMPTY_MESSAGES;
        return {
          roomId: openId,
          items: typeof action === 'function' ? action(base) : action,
          loaded: same && prev.loaded,
        };
      });
    },
    [roomIdRef],
  );
  // Tin đầu tiên chưa đọc lúc mở phòng; giữ nguyên tới khi đổi phòng
  const [unreadFromId, setUnreadFromId] = useState<string | null>(null);
  const unreadScrolledRef = useRef('');
  const readsQuery = useQuery({
    queryKey: queryKeys.reads(roomId),
    queryFn: () => api.reads(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(roomId),
    queryFn: () => api.members(roomId),
    enabled: Boolean(roomId),
  });
  const pinsQuery = useQuery({
    queryKey: queryKeys.pins(roomId),
    queryFn: () => api.pins(roomId),
    enabled: Boolean(roomId),
  });
  const reads = readsQuery.data ?? EMPTY_READS;
  const members = membersQuery.data ?? EMPTY_MEMBERS;
  const membersLoaded = membersQuery.status !== 'pending';
  const pins = pinsQuery.data ?? EMPTY_PINS;
  const setReads = useRoomCacheSetter<RoomRead>(queryKeys.reads, roomIdRef);
  const setMembers = useRoomCacheSetter<RoomMember>(queryKeys.members, roomIdRef);
  const setPins = useRoomCacheSetter<ChatMessage>(queryKeys.pins, roomIdRef);
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
            current.map((r) => (r.id === rid ? { ...r, unreadCount: 0, mentioned: false } : r)),
          );
        })
        .catch(() => {
          lastReadSentRef.current = '';
        });
    },
    [roomIdRef, setReads, setRooms],
  );

  useEffect(() => {
    if (!roomId) {
      // Phòng cuối cùng vừa bị xóa/rời: không để tin cũ còn trên màn hình
      setStore({ roomId: '', items: EMPTY_MESSAGES, loaded: false });
      return;
    }
    let cancelled = false;
    setUnreadFromId(null);
    setPending(false);
    setOnline([]);
    setPageMeta({ hasMore: false, nextCursor: null });
    pageMetaRef.current = { hasMore: false, nextCursor: null };
    setLoadingOlder(false);
    api
      .messages(roomId)
      .then((page) => {
        if (!cancelled) {
          const opened = unreadOnOpenRef.current;
          setUnreadFromId(
            firstUnreadId(
              page.data,
              opened?.roomId === roomId ? opened.count : 0,
              userRef.current.id,
            ),
          );
          setStore((prev) => ({
            roomId,
            // Tin tới qua socket trong lúc đang tải (mới hơn trang vừa nạp) được giữ lại
            items:
              prev.roomId === roomId
                ? mergeNewer(page.data, prev.items)
                : page.data,
            loaded: true,
          }));
          setPageMeta(page.meta);
          pageMetaRef.current = page.meta;
          const latest = page.data[page.data.length - 1];
          if (!latest) {
            setRooms((current) =>
              current.map((r) => (r.id === roomId ? { ...r, unreadCount: 0, mentioned: false } : r)),
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
      // Mở phòng có tin chưa đọc: đưa vạch lên đầu khung (một lần), sau đó tin mới vẫn cuộn xuống cuối
      const divider =
        unreadFromId && unreadScrolledRef.current !== roomId
          ? el.querySelector<HTMLElement>('.unread-divider')
          : null;
      if (divider) {
        divider.scrollIntoView({ block: 'start' });
        unreadScrolledRef.current = roomId;
      } else {
        el.scrollTop = el.scrollHeight;
      }
      lastRoomIdRef.current = roomId;
      lastMessageIdRef.current = latestId;
    }
  }, [messages, pending, roomId, unreadFromId]);

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
    // Gửi xong mà đã sang phòng khác thì tin không được chèn vào phòng đang mở
    if (!message.roomId || message.roomId === roomIdRef.current) {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
    }
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
    messagesLoaded,
    setMessages,
    unreadFromId,
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
