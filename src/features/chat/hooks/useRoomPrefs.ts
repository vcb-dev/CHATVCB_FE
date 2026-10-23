import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Room } from '@/types';
import { sortRooms } from '../utils/rooms';

export function useRoomPrefs({
  setRooms,
  removeRoom,
}: {
  setRooms: Dispatch<SetStateAction<Room[]>>;
  removeRoom: (roomId: string) => void;
}) {
  const queryClient = useQueryClient();

  const togglePin = useCallback(
    async (room: Room) => {
      const nextPinned = !room.pinned;
      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      setRooms((prev) =>
        sortRooms(prev.map((r) => (r.id === room.id ? { ...r, pinned: nextPinned } : r))),
      );
      try {
        await api.updateRoomPrefs(room.id, { pinned: nextPinned });
      } catch (err) {
        setRooms((prev) =>
          sortRooms(prev.map((r) => (r.id === room.id ? { ...r, pinned: room.pinned } : r))),
        );
        antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      }
    },
    [queryClient, setRooms],
  );

  const toggleUnread = useCallback(
    async (room: Room) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      const hasUnread = (room.unreadCount ?? 0) > 0 || (room.markedUnread ?? false);

      if (hasUnread && room.lastMessageId) {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, unreadCount: 0, markedUnread: false } : r,
          ),
        );
        try {
          await api.markRead(room.id, room.lastMessageId);
        } catch (err) {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === room.id
                ? { ...r, unreadCount: room.unreadCount, markedUnread: room.markedUnread }
                : r,
            ),
          );
          antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
        } finally {
          void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
        }
      } else {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, markedUnread: true } : r)),
        );
        try {
          await api.updateRoomPrefs(room.id, { markedUnread: true });
        } catch (err) {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === room.id ? { ...r, markedUnread: room.markedUnread } : r,
            ),
          );
          antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
        } finally {
          void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
        }
      }
    },
    [queryClient, setRooms],
  );

  const hide = useCallback(
    (room: Room) => {
      Modal.confirm({
        title: 'Ẩn cuộc trò chuyện này?',
        content: 'Cuộc trò chuyện sẽ hiện lại khi có tin nhắn mới, hoặc khi bạn tìm và mở lại.',
        okText: 'Ẩn',
        onOk: async () => {
          await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
          removeRoom(room.id);
          try {
            await api.updateRoomPrefs(room.id, { hidden: true });
          } catch (err) {
            setRooms((prev) => sortRooms([...prev, room]));
            antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
          } finally {
            void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
          }
        },
      });
    },
    [queryClient, removeRoom, setRooms],
  );

  const mute = useCallback(
    async (room: Room, minutes: number | null) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      const optimisticUntil = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null;
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id ? { ...r, muted: true, mutedUntil: optimisticUntil } : r,
        ),
      );
      try {
        const res = await api.muteRoom(room.id, true, minutes ?? undefined);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, muted: res.muted, mutedUntil: res.mutedUntil } : r,
          ),
        );
      } catch (err) {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, muted: room.muted, mutedUntil: room.mutedUntil } : r,
          ),
        );
        antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      }
    },
    [queryClient, setRooms],
  );

  const unmute = useCallback(
    async (room: Room) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, muted: false, mutedUntil: null } : r)),
      );
      try {
        const res = await api.muteRoom(room.id, false);
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, muted: res.muted, mutedUntil: res.mutedUntil } : r,
          ),
        );
      } catch (err) {
        setRooms((prev) =>
          prev.map((r) =>
            r.id === room.id ? { ...r, muted: room.muted, mutedUntil: room.mutedUntil } : r,
          ),
        );
        antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      }
    },
    [queryClient, setRooms],
  );

  const setLabel = useCallback(
    async (room: Room, labelId: string | null) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, labelId } : r)),
      );
      try {
        await api.updateRoomPrefs(room.id, { labelId });
      } catch (err) {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, labelId: room.labelId ?? null } : r)),
        );
        antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      }
    },
    [queryClient, setRooms],
  );

  return {
    togglePin,
    toggleUnread,
    hide,
    mute,
    unmute,
    setLabel,
  };
}
