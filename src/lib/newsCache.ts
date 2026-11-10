import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { NewsCommentPage, NewsFeedPage, NewsFeedPost, NewsReactionSummary } from '@/types';

export const NEWS_COMMENT_PREVIEW = 2;

export function previewOf(page: NewsCommentPage): NewsCommentPage {
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((item) => ({ ...item, replies: [] })),
  };
}

export function patchFeedPages(
  data: InfiniteData<NewsFeedPage> | undefined,
  postId: string,
  patch: (post: NewsFeedPost) => NewsFeedPost,
): InfiniteData<NewsFeedPage> | undefined {
  if (!data) {
    return undefined;
  }
  let hasChange = false;
  const pages = data.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((item) => {
      if (item.id === postId) {
        pageChanged = true;
        hasChange = true;
        return patch(item);
      }
      return item;
    });
    return pageChanged ? { ...page, items } : page;
  });
  return hasChange ? { ...data, pages } : data;
}

export function patchNewsFeedPost(
  queryClient: QueryClient,
  postId: string,
  patch: (post: NewsFeedPost) => NewsFeedPost,
): void {
  queryClient.setQueriesData<InfiniteData<NewsFeedPage>>(
    { queryKey: queryKeys.newsPosts },
    (data) => patchFeedPages(data, postId, patch),
  );
}

export function hasFeedPost(queryClient: QueryClient, postId: string): boolean {
  const queries = queryClient.getQueriesData<InfiniteData<NewsFeedPage>>({
    queryKey: queryKeys.newsPosts,
  });
  for (const [, data] of queries) {
    if (data?.pages.some((page) => page.items.some((item) => item.id === postId))) {
      return true;
    }
  }
  return false;
}

export async function refreshNewsCommentPreview(
  queryClient: QueryClient,
  postId: string,
): Promise<void> {
  if (!hasFeedPost(queryClient, postId)) {
    return;
  }
  const page = await api.newsComments(postId, undefined, NEWS_COMMENT_PREVIEW);
  patchNewsFeedPost(queryClient, postId, (post) => ({
    ...post,
    comments: previewOf(page),
  }));
}

/** `mine` chỉ đổi khi chính mình bấm; sự kiện của người khác giữ nguyên lựa chọn của mình */
export function applyNewsReactions(
  queryClient: QueryClient,
  postId: string,
  summary: Omit<NewsReactionSummary, 'mine'> & { mine?: NewsReactionSummary['mine'] },
): void {
  patchNewsFeedPost(queryClient, postId, (post) => ({
    ...post,
    reactions: {
      total: summary.total,
      counts: summary.counts,
      top: summary.top,
      mine: summary.mine === undefined ? post.reactions.mine : summary.mine,
    },
  }));
}

export function applyNewsCommentCount(
  queryClient: QueryClient,
  postId: string,
  commentCount: number,
): void {
  patchNewsFeedPost(queryClient, postId, (post) => ({ ...post, commentCount }));
}
