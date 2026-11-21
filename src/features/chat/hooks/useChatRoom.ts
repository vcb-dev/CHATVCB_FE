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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { isTemp, prependOlder, receiveMessage, trimMessages } from '../utils/messageCache';
import { getMessages, loadLatest, MESSAGES_GC_MS, updateMessages } from '../utils/messageStore';
import { isDirectRoom, previewOf, upsertRoom } from '../utils/rooms';
import { firstUnreadId } from '../utils/unread';
import { useRoomCacheSetter } from './useRoomCacheSetter';
import type { Workspace } from './useWorkspace';

const MAX_JUMP_PAGES = 10;
const EMPTY_READS: RoomRead[] = [];
const EMPTY_MEMBERS: RoomMember[] = [];
const EMPTY_PINS: ChatMessage[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_META: PageMeta = { hasMore: false, nextCursor: null };

/** Tin thật mới nhất (bỏ tin tạm chưa có id thật). */
function lastConfirmed(messages: ChatMessage[]): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (!isTemp(messages[index])) {
      return messages[index];
    }
  }
  return undefined;
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
  const queryClient = useQueryClient();
  // Tin theo phòng nằm trong cache: mở lại phòng đã xem thì hiện ngay, trang mới nhất tải lại ở nền
  // (staleTime 0) rồi trộn trong queryFn. Phòng chưa có cache thì không còn tin của phòng cũ trên màn hình.
  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(roomId),
    queryFn: () => loadLatest(queryClient, roomId),
    enabled: Boolean(roomId),
    staleTime: 0,
    gcTime: MESSAGES_GC_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const cached = roomId ? messagesQuery.data : undefined;
  const messagesLoaded = Boolean(cached);
  const messages = cached?.items ?? EMPTY_MESSAGES;
  const pageMeta = cached?.meta ?? EMPTY_META;
  // Mọi chỗ sửa danh sách tin (socket, sửa, xóa, thả cảm xúc…) đều tác động lên phòng đang mở
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = useCallback(
    (action) => {
      const openId = roomIdRef.current;
      if (!openId) {
        return;
      }
      updateMessages(queryClient, openId, (cache) => {
        const items = typeof action === 'function' ? action(cache.items) : action;
        return items === cache.items ? cache : { ...cache, items };
      });
    },
    [queryClient, roomIdRef],
  );
  // Tin đầu tiên chưa đọc lúc mở phòng; tính một lần mỗi lần mở, ngay lần vẽ đầu có tin
  // (cùng lượt với tin để effect cuộn thấy vạch "Tin nhắn chưa đọc")
  const openSeqRef = useRef({ roomId: '', seq: 0 });
  if (openSeqRef.current.roomId !== roomId) {
    openSeqRef.current = { roomId, seq: openSeqRef.current.seq + 1 };
  }
  const openSeq = openSeqRef.current.seq;
  const unreadRef = useRef<{ seq: number; id: string | null }>({ seq: 0, id: null });
  if (messagesLoaded && unreadRef.current.seq !== openSeq) {
    const opened = unreadOnOpenRef.current;
    unreadRef.current = {
      seq: openSeq,
      id: firstUnreadId(
        messages.filter((item) => !isTemp(item)),
        opened?.roomId === roomId ? opened.count : 0,
        user.id,
      ),
    };
  }
  const unreadFromId = unreadRef.current.seq === openSeq ? unreadRef.current.id : null;
  const unreadScrolledRef = useRef('');
  const readsQuery = useQuery({
    queryKey: queryKeys.reads(roomId),
    queryFn: () => api.reads(roomId),
    enabled: Boolean(roomId),
    // Đã nhận/đã xem tới qua socket `room.reads`, mà socket chỉ ở trong phòng đang mở:
    // mở lại phòng cũ thì tải mới vì lúc vắng mặt đã lỡ sự kiện
    staleTime: 0,
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
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  // Khung tin đã cuộn lần trước; khác phần tử hiện tại nghĩa là khung vừa mount lại
  const scrolledListRef = useRef<HTMLDivElement | null>(null);
  // Đang ở đáy: ảnh tải xong làm khung dài ra thì kéo tiếp xuống cuối; người dùng cuộn lên thì thôi
  const stickBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string>('');
  const lastRoomIdRef = useRef<string>('');
  const pendingJumpRef = useRef<{ id: string; createdAt?: string } | null>(null);
  // Tăng khi cần nhảy tới tin trong phòng đang mở, để effect nhảy chạy lại sau khi khung tin đã vẽ
  const [jumpTick, setJumpTick] = useState(0);
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
      // Tin tạm chưa có id thật thì BE không biết, lấy tin thật mới nhất
      const latest = message ?? lastConfirmed(messagesRef.current);
      if (!latest || isTemp(latest)) {
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

  // Đổi phòng: rời phòng cũ thì cắt cache còn một trang (lần mở sau chỉ tải lại một trang)
  const prevRoomRef = useRef(roomId);
  useEffect(() => {
    const prev = prevRoomRef.current;
    prevRoomRef.current = roomId;
    if (prev && prev !== roomId) {
      updateMessages(queryClient, prev, (cache) => trimMessages(cache));
    }
    setPending(false);
    setOnline([]);
    setLoadingOlder(false);
  }, [roomId]);

  // Lần mở đầu (chưa có cache) tải hỏng; có cache thì giữ cache, lỗi tải nền bỏ qua
  useEffect(() => {
    if (roomId && messagesQuery.isError && !messagesQuery.data) {
      setError('Không tải được tin nhắn.');
    }
  }, [roomId, messagesQuery.isError, messagesQuery.data, setError]);

  // Có tin (từ cache hay vừa tải) và mỗi khi tin thật mới nhất đổi: đang xem thì báo đã đọc
  const latestConfirmedId = lastConfirmed(messages)?.id ?? '';
  useEffect(() => {
    if (!roomId || !messagesLoaded) {
      return;
    }
    if (!latestConfirmedId) {
      setRooms((current) =>
        current.map((r) => (r.id === roomId ? { ...r, unreadCount: 0, mentioned: false } : r)),
      );
    } else if (isViewingChat()) {
      markMessageRead(undefined, roomId);
    }
  }, [roomId, messagesLoaded, latestConfirmedId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    const latestId = messages[messages.length - 1]?.id ?? '';
    const roomChanged = lastRoomIdRef.current !== roomId;
    const latestChanged = lastMessageIdRef.current !== latestId;
    // Sang Docs, Công việc… rồi quay lại Tin nhắn: khung tin mount mới với scrollTop = 0
    const remounted = scrolledListRef.current !== el;

    if (roomChanged || latestChanged || pending || remounted) {
      // Mở phòng có tin chưa đọc: đưa vạch lên đầu khung (một lần), sau đó tin mới vẫn cuộn xuống cuối
      const divider =
        unreadFromId && unreadScrolledRef.current !== roomId
          ? el.querySelector<HTMLElement>('.unread-divider')
          : null;
      if (divider) {
        divider.scrollIntoView({ block: 'start' });
        unreadScrolledRef.current = roomId;
        stickBottomRef.current = false;
      } else {
        el.scrollTop = el.scrollHeight;
        stickBottomRef.current = true;
      }
      lastRoomIdRef.current = roomId;
      lastMessageIdRef.current = latestId;
      scrolledListRef.current = el;
    }
  }, [messages, pending, roomId, unreadFromId, workspace]);

  // Ảnh chưa tải thì chưa có chiều cao: cuộn xuống cuối xong, ảnh hiện ra lại đẩy đáy đi mất.
  // Gắn lại mỗi lần đổi màn vì quay về Tin nhắn là một khung tin mới.
  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    // `load` của ảnh không nổi bọt, phải nghe ở pha capture
    const onLoad = () => {
      if (stickBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('load', onLoad, true);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('load', onLoad, true);
    };
  }, [workspace]);

  // Nhảy tới tin chờ sẵn (mở từ Công việc, Docs…) chỉ khi tin của phòng đã vẽ và khung tin đã mount.
  // Gọi ngay hoặc trong requestAnimationFrame thì có lúc chạy trước khi React vẽ, báo nhầm "Không tìm thấy tin nhắn".
  // Đặt sau effect cuộn xuống cuối ở trên để vị trí tin không bị ghi đè.
  useEffect(() => {
    const target = pendingJumpRef.current;
    if (!target || !messagesLoaded || !listRef.current) {
      return;
    }
    pendingJumpRef.current = null;
    void jumpToMessage(target.id, target.createdAt);
  }, [messagesLoaded, roomId, jumpTick]);

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
      updateMessages(queryClient, startRoom, (cache) => prependOlder(cache, page.data, page.meta));
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
    // Đang xem tin được nhảy tới: ảnh tải xong không kéo về đáy
    stickBottomRef.current = false;
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
    let meta = getMessages(queryClient, startRoom)?.meta ?? EMPTY_META;
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
      const reached = meta;
      updateMessages(queryClient, startRoom, (cache) => prependOlder(cache, older, reached));
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
    pendingJumpRef.current = { id: messageId, createdAt };
    if (roomId !== targetRoomId) {
      setRoomId(targetRoomId);
    } else {
      // Cùng phòng nhưng có thể đang ở màn khác (Docs, Công việc): chờ khung tin mount rồi mới nhảy
      setJumpTick((tick) => tick + 1);
    }
  }

  function appendMessage(message: ChatMessage) {
    // Chèn vào cache đúng phòng của tin, không phải phòng đang mở
    updateMessages(queryClient, message.roomId || roomIdRef.current, (cache) =>
      receiveMessage(cache, message),
    );
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
    markMessageRead(message, message.roomId || undefined);
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
