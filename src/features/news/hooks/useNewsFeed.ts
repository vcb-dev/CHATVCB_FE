import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { NewsFeedPage } from '@/types';
import { NEWS_FEED_PAGE } from '../utils/feed';

export function useNewsFeed() {
  return useInfiniteQuery<NewsFeedPage>({
    queryKey: queryKeys.newsPosts,
    queryFn: ({ pageParam }) =>
      api.newsPosts({ cursor: pageParam as string | undefined, limit: NEWS_FEED_PAGE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

