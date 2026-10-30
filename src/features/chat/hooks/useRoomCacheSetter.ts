import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRoomCacheSetter<T>(
  keyOf: (roomId: string) => readonly unknown[],
  roomIdRef: RefObject<string>,
): Dispatch<SetStateAction<T[]>> {
  const queryClient = useQueryClient();
  return useCallback(
    (action) => {
      const roomId = roomIdRef.current;
      if (!roomId) {
        return;
      }
      queryClient.setQueryData<T[]>(keyOf(roomId), (old) =>
        typeof action === 'function' ? action(old ?? []) : action,
      );
    },
    [queryClient, keyOf, roomIdRef],
  );
}
