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
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { connectSocket } from '@/api/socket';
import { notifyIncoming } from '@/lib/notify';
import type {
  AgentPendingEvent,
  ChatMessage,
  PresenceUser,
  Room,
  RoomMember,
  RoomRead,
  RoomReadsEvent,
  RoomRemovedEvent,
  RoomClosedEvent,
  TypingEvent,
  User,
} from '@/types';
import { mentionsUser } from '../utils/mentions';
import { isDirectRoom, isRoomMuted, previewOf, upsertRoom } from '../utils/rooms';
import { isVoice } from '../utils/attachments';

const TYPING_TTL_MS = 6000;

type Options = {
  user: User;
  myHandle: string;
  roomId: string;
  roomIdRef: RefObject<string>;
  rooms: Room[];
  refreshRooms: () => Promise<Room[]>;
  removeRoom: (roomId: string) => void;
  openRoom: (roomId: string) => void;
  isViewingChat: () => boolean;
  markMessageRead: (message?: ChatMessage, targetRoomId?: string) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPending: Dispatch<SetStateAction<boolean>>;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setOnline: Dispatch<SetStateAction<PresenceUser[]>>;
  setReads: Dispatch<SetStateAction<RoomRead[]>>;
  setPins: Dispatch<SetStateAction<ChatMessage[]>>;
  setMembers: Dispatch<SetStateAction<RoomMember[]>>;
};

export function useChatSocket(options: Options) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState<TypingEvent[]>([]);
  const typingTimersRef = useRef(new Map<string, number>());
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef('');
  const latestRef = useRef(options);
  latestRef.current = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('chatvcb.token');
    if (!token) {
      return;
    }
    const {
      roomIdRef,
      isViewingChat,
      markMessageRead,
      setMessages,
      setPending,
      setRooms,
      setOnline,
      setReads,
      setPins,
      setMembers,
    } = latestRef.current;
    const socket = connectSocket(token);
    socketRef.current = socket;
    const typingTimers = typingTimersRef.current;

    function dropTyping(roomId: string, userId: string) {
      const key = `${roomId}:${userId}`;
      window.clearTimeout(typingTimers.get(key));
      typingTimers.delete(key);
      setTyping((current) =>
        current.filter((item) => item.roomId !== roomId || item.userId !== userId),
      );
    }

    function alertIncoming(message: ChatMessage, room: Room, tagged: boolean) {
      if (isRoomMuted(room) && !tagged) {
        return;
      }
      const name = room.title || room.name;
      if (tagged) {
        void antMessage.info({
          className: 'mention-alert',
          content:
            room.id === roomIdRef.current
              ? `${message.authorName} đã tag bạn`
              : `${message.authorName} đã tag bạn trong ${name}`,
        });
      }
      notifyIncoming({
        title: message.authorName,
        subtitle: name,
        body:
          message.content.trim() ||
          (isVoice(message) ? 'Tin nhắn thoại' : '') ||
          (message.fileName ? `[Tệp] ${message.fileName}` : '') ||
          (message.imageUrl ? 'Đã gửi một ảnh' : 'Tin nhắn mới'),
        mentioned: tagged,
        tag: message.id,
        roomId: room.id,
        onOpen: () => latestRef.current.openRoom(room.id),
      });
    }

    socket.on('connect', () => {
      socket.emit('presence.get');
      socket.emit('inbox.subscribe');
      if (roomIdRef.current) {
        socket.emit('join', roomIdRef.current);
      }
    });
    socket.on('message', (message: ChatMessage) => {
      if (message.userId) {
        dropTyping(message.roomId, message.userId);
      }
      const open = message.roomId === roomIdRef.current;
      if (open) {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [...current, message];
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.roomMedia(message.roomId) });
        if (message.role === 'agent') {
          setPending(false);
        }
      }
      const { user, myHandle, rooms, refreshRooms } = latestRef.current;
      const mine = message.userId === user.id;
      const system = message.role === 'system';
      const tagged =
        !mine &&
        message.role === 'user' &&
        mentionsUser(message.content, myHandle);
      const viewing = open && isViewingChat();
      if (!mine && viewing) {
        markMessageRead(message, message.roomId);
      }
      const known = rooms.find((r) => r.id === message.roomId);
      if (!known) {
        // refreshRooms gộp trang 1 vào cache và dùng lại lần tải đang chạy
        void refreshRooms()
          .then((list) => {
            const fresh = list.find((r) => r.id === message.roomId);
            if (fresh && !mine && !system) {
              alertIncoming(message, fresh, tagged);
            }
          })
          .catch(() => {
            // poll 10 giây sẽ bù
          });
        return;
      }
      if (!mine && !system) {
        alertIncoming(message, known, tagged);
      }
      setRooms((current) => {
        const target = current.find((r) => r.id === message.roomId);
        if (!target) {
          return current;
        }
        const updated: Room = {
          ...target,
          lastMessagePreview: previewOf(message, latestRef.current.user?.id, isDirectRoom(target)),
          updatedAt: message.createdAt,
          unreadCount: viewing ? 0 : target.unreadCount + (mine || system ? 0 : 1),
        };
        return upsertRoom(current, updated);
      });
    });
    socket.on('room.typing', (payload: TypingEvent) => {
      if (payload.userId === latestRef.current.user.id) {
        return;
      }
      if (!payload.typing) {
        dropTyping(payload.roomId, payload.userId);
        return;
      }
      const key = `${payload.roomId}:${payload.userId}`;
      window.clearTimeout(typingTimers.get(key));
      setTyping((current) => {
        const same = (item: TypingEvent) =>
          item.roomId === payload.roomId && item.userId === payload.userId;
        return current.some(same)
          ? current.map((item) => (same(item) ? payload : item))
          : [...current, payload];
      });
      typingTimers.set(
        key,
        window.setTimeout(() => dropTyping(payload.roomId, payload.userId), TYPING_TTL_MS),
      );
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.roomMedia(message.roomId) });
        setPins((current) => {
          if (message.pinned && !message.recalled) {
            return [message, ...current.filter((item) => item.id !== message.id)];
          }
          return current.filter((item) => item.id !== message.id);
        });
      }
    });
    socket.on('room.removed', (payload: RoomRemovedEvent) => {
      const { rooms, removeRoom } = latestRef.current;
      const gone = rooms.find((r) => r.id === payload.roomId);
      removeRoom(payload.roomId);
      if (gone) {
        void antMessage.info(`Bạn đã bị xóa khỏi nhóm ${gone.title || gone.name}.`);
      }
    });
    socket.on('room.closed', (payload: RoomClosedEvent) => {
      const { rooms, removeRoom } = latestRef.current;
      const gone = rooms.find((r) => r.id === payload.roomId);
      removeRoom(payload.roomId);
      if (gone && payload.reason === 'dissolved') {
        void antMessage.info(`Nhóm ${gone.title || gone.name} đã bị giải tán.`);
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
      for (const timer of typingTimers.values()) {
        window.clearTimeout(timer);
      }
      typingTimers.clear();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    if (joinedRoomRef.current && joinedRoomRef.current !== options.roomId) {
      socket.emit('leave', joinedRoomRef.current);
    }
    if (options.roomId) {
      socket.emit('join', options.roomId);
    }
    joinedRoomRef.current = options.roomId;
  }, [options.roomId]);

  const emitTyping = useCallback((roomId: string, active: boolean) => {
    socketRef.current?.emit('typing', { roomId, typing: active });
  }, []);

  return { onlineUserIds, typing, emitTyping };
}
