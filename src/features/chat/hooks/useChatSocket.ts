import { message as antMessage } from 'antd';
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
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
  User,
} from '@/types';
import { mentionsUser } from '../utils/mentions';
import { isDirectRoom, previewOf, upsertRoom } from '../utils/rooms';

type Options = {
  user: User;
  myHandle: string;
  roomId: string;
  roomIdRef: RefObject<string>;
  roomName: string;
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
  const socketRef = useRef<Socket | null>(null);
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.roomMedia(message.roomId) });
      if (message.role === 'agent') {
        setPending(false);
      }
      const { user, myHandle, roomName } = latestRef.current;
      const mine = message.userId === user.id;
      const tagged =
        !mine &&
        message.role === 'user' &&
        mentionsUser(message.content, myHandle);
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
          subtitle: roomName,
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
          lastMessagePreview: previewOf(message, latestRef.current.user?.id, isDirectRoom(target)),
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.roomMedia(message.roomId) });
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
    if (options.roomId) {
      socketRef.current?.emit('join', options.roomId);
    }
  }, [options.roomId]);

  return { onlineUserIds };
}
