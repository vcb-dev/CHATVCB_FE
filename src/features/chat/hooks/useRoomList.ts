import { message as antMessage } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { PageMeta, Room } from '@/types';
import { mergeRooms, sortRooms, upsertRoom } from '../utils/rooms';

export function useRoomList({
  isViewingChat,
  setError,
}: {
  isViewingChat: () => boolean;
  setError: (error: string) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [roomsMeta, setRoomsMeta] = useState<PageMeta>({ hasMore: false, nextCursor: null });
  const [loadingOlderRooms, setLoadingOlderRooms] = useState(false);
  const roomsMetaRef = useRef<PageMeta>({ hasMore: false, nextCursor: null });
  const hasLoadedMoreRoomsRef = useRef(false);
  const roomIdRef = useRef('');

  const room = useMemo(
    () => rooms.find((item) => item.id === roomId) ?? null,
    [rooms, roomId],
  );

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
  }, [isViewingChat, setError]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

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
  };
}
