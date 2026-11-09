import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { NewsCardPage } from '@/types';

/** Danh sách bài đã đăng dùng chung cache với cột "Bài mới khác". */
export function useNewsList(kind: 'published' | 'drafts') {
  return useInfiniteQuery({
    queryKey: kind === 'drafts' ? queryKeys.newsDrafts : queryKeys.newsPosts,
    queryFn: ({ pageParam }): Promise<NewsCardPage> =>
      kind === 'drafts' ? api.newsDrafts({ cursor: pageParam }) : api.newsPosts({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
