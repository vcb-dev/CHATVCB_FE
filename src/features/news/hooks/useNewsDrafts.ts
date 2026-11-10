import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { NewsCardPage } from '@/types';

export function useNewsDrafts() {
  return useInfiniteQuery<NewsCardPage>({
    queryKey: queryKeys.newsDrafts,
    queryFn: ({ pageParam }) => api.newsDrafts({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

