import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { LastSeenMap } from '@/types';

const EMPTY_LAST_SEEN: LastSeenMap = {};
const EMPTY_ONLINE_IDS = new Set<string>();
const STALE_MS = 5 * 60 * 1000;
const TICK_MS = 60 * 1000;

export type LastSeenContextValue = {
  lastSeen: LastSeenMap;
  now: number;
  onlineUserIds: Set<string>;
};

export const LastSeenContext = createContext<LastSeenContextValue>({
  lastSeen: EMPTY_LAST_SEEN,
  now: 0,
  onlineUserIds: EMPTY_ONLINE_IDS,
});

export function useLastSeen() {
  const { data } = useQuery({
    queryKey: queryKeys.lastSeen,
    queryFn: api.lastSeen,
    staleTime: STALE_MS,
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return { lastSeen: data ?? EMPTY_LAST_SEEN, now };
}

export function useLastSeenContext(): LastSeenContextValue {
  return useContext(LastSeenContext);
}
