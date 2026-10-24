import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Room, RoomMute } from '@/types';
import { sortRooms } from '../utils/rooms';

export function useRoomPrefs({
  setRooms,
  removeRoom,
}: {
  setRooms: Dispatch<SetStateAction<Room[]>>;
  removeRoom: (roomId: string) => void;
}) {
  const queryClient = useQueryClient();

  // Cập nhật tạm `patch` lên phòng, gọi API, lỗi thì hoàn lại đúng các khóa trong `patch`
  const apply = useCallback(
    async <T,>(
      room: Room,
      patch: Partial<Room>,
      request: () => Promise<T>,
      onDone?: (res: T) => void,
    ): Promise<boolean> => {
      const update = (values: Partial<Room>) =>
        setRooms((prev) => {
          const next = prev.map((r) => (r.id === room.id ? { ...r, ...values } : r));
          return 'pinned' in values ? sortRooms(next) : next;
        });

      await queryClient.cancelQueries({ queryKey: queryKeys.rooms });
      update(patch);
      try {
        const res = await request();
        onDone?.(res);
        return true;
      } catch (err) {
        update(
          Object.fromEntries(
            Object.keys(patch).map((key) => [key, room[key as keyof Room]]),
          ) as Partial<Room>,
        );
        antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
        return false;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      }
    },
    [queryClient, setRooms],
  );

  const togglePin = useCallback(
    (room: Room) =>
      apply(room, { pinned: !room.pinned }, () =>
        api.updateRoomPrefs(room.id, { pinned: !room.pinned }),
      ),
    [apply],
  );

  const toggleUnread = useCallback(
    (room: Room) => {
      const hasUnread = (room.unreadCount ?? 0) > 0 || (room.markedUnread ?? false);
      if (!hasUnread) {
        return apply(room, { markedUnread: true }, () =>
          api.updateRoomPrefs(room.id, { markedUnread: true }),
        );
      }
      return apply<unknown>(room, { unreadCount: 0, markedUnread: false }, () =>
        room.lastMessageId
          ? api.markRead(room.id, room.lastMessageId)
          : api.updateRoomPrefs(room.id, { markedUnread: false }),
      );
    },
    [apply],
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

  const writeMute = useCallback(
    (roomId: string) => (res: RoomMute) =>
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, muted: res.muted, mutedUntil: res.mutedUntil } : r,
        ),
      ),
    [setRooms],
  );

  const mute = useCallback(
    (room: Room, minutes: number | null) =>
      apply(
        room,
        {
          muted: true,
          mutedUntil: minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null,
        },
        () => api.muteRoom(room.id, true, minutes ?? undefined),
        writeMute(room.id),
      ),
    [apply, writeMute],
  );

  const unmute = useCallback(
    (room: Room) =>
      apply(
        room,
        { muted: false, mutedUntil: null },
        () => api.muteRoom(room.id, false),
        writeMute(room.id),
      ),
    [apply, writeMute],
  );

  const setLabel = useCallback(
    (room: Room, labelId: string | null) =>
      apply(room, { labelId }, () => api.updateRoomPrefs(room.id, { labelId })),
    [apply],
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
