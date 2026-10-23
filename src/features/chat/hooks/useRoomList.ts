import { message as antMessage } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { PageMeta, Room, RoomsPage } from '@/types';
import { mergeRooms, sortRooms, upsertRoom } from '../utils/rooms';

const EMPTY_ROOMS: Room[] = [];
const EMPTY_META: PageMeta = { hasMore: false, nextCursor: null };

export function useRoomList({
  isViewingChat,
  setError,
}: {
  isViewingChat: () => boolean;
  setError: (error: string) => void;
}) {
  const [roomId, setRoomId] = useState('');
  const [loadingOlderRooms, setLoadingOlderRooms] = useState(false);
  const hasLoadedMoreRoomsRef = useRef(false);
  const roomIdRef = useRef('');

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const queryClient = useQueryClient();

  const fetchRoomList = useCallback(async (): Promise<RoomsPage> => {
    const page = await api.rooms();
    const prev = queryClient.getQueryData<RoomsPage>(queryKeys.rooms);
    const merged = mergeRooms(prev?.data ?? [], page.data, roomIdRef.current, page.meta.hasMore, isViewingChat());
    if (!prev || !roomIdRef.current) {
      setRoomId((current) => current || merged[0]?.id || '');
    } else if (!merged.some((r) => r.id === roomIdRef.current)) {
      setRoomId(merged[0]?.id ?? '');
    }
    const keepMeta = Boolean(prev) && hasLoadedMoreRoomsRef.current && page.meta.hasMore;
    if (!page.meta.hasMore) {
      hasLoadedMoreRoomsRef.current = false;
    }
    return { data: merged, meta: keepMeta && prev ? prev.meta : page.meta };
  }, [queryClient, isViewingChat]);

  const { data, isError } = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: fetchRoomList,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const rooms = data?.data ?? EMPTY_ROOMS;
  const roomsMeta = data?.meta ?? EMPTY_META;

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );

  useEffect(() => {
    if (isError && !data) {
      setError('Không tải được danh sách phòng.');
    }
  }, [isError, data, setError]);

  const setRooms: Dispatch<SetStateAction<Room[]>> = useCallback(
    (action) => {
      queryClient.setQueryData<RoomsPage>(queryKeys.rooms, (old) =>
        old && { data: typeof action === 'function' ? action(old.data) : action, meta: old.meta },
      );
    },
    [queryClient],
  );

  async function openRoom(nextRoom: Room) {
    if (nextRoom.hidden) {
      try {
        await api.updateRoomPrefs(nextRoom.id, { hidden: false });
      } catch (err) {
        antMessage.error(err instanceof Error ? err.message : 'Không mở được phòng.');
        return;
      }
    }
    setRooms((prev) => upsertRoom(prev, { ...nextRoom, hidden: false }));
    setRoomId(nextRoom.id);
  }

  function selectRoom(next: Room) {
    setRoomId(next.id);
    setRooms((current) =>
      current.map((r) => (r.id === next.id ? { ...r, unreadCount: 0 } : r)),
    );
  }

  function updateRoom(next: Room) {
    setRooms((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)));
  }

  function removeRoom(removedRoomId: string) {
    setRooms((prev) => {
      const next = prev.filter((item) => item.id !== removedRoomId);
      if (roomIdRef.current === removedRoomId) {
        setRoomId(next[0]?.id ?? '');
      }
      return next;
    });
  }

  async function loadMoreRooms() {
    const meta = queryClient.getQueryData<RoomsPage>(queryKeys.rooms)?.meta;
    if (loadingOlderRooms || !meta?.hasMore || !meta.nextCursor) {
      return;
    }
    setLoadingOlderRooms(true);
    hasLoadedMoreRoomsRef.current = true;
    try {
      const page = await api.rooms(meta.nextCursor);
      queryClient.setQueryData<RoomsPage>(queryKeys.rooms, (old) => {
        if (!old) {
          return old;
        }
        const existingIds = new Set(old.data.map((r) => r.id));
        const newRooms = page.data.filter((r) => !existingIds.has(r.id));
        return {
          data: sortRooms([...old.data, ...newRooms]),
          meta: page.meta,
        };
      });
    } catch (err) {
      antMessage.error(
        err instanceof Error ? err.message : 'Không tải thêm được danh sách phòng.',
      );
    } finally {
      setLoadingOlderRooms(false);
    }
  }

  const refreshRooms = useCallback(
    () => queryClient.fetchQuery({ queryKey: queryKeys.rooms, queryFn: fetchRoomList }).then((page) => page.data),
    [queryClient, fetchRoomList],
  );

  return {
    rooms,
    setRooms,
    room,
    roomId,
    setRoomId,
    roomIdRef,
    roomsMeta,
    loadingOlderRooms,
    openRoom,
    selectRoom,
    updateRoom,
    removeRoom,
    loadMoreRooms,
    refreshRooms,
  };
}
