import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import type { NewsFeedPage, NewsFeedPost, NewsPost, NewsReactionSummary } from '@/types';

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

export function patchNewsPost(
  queryClient: QueryClient,
  postId: string,
  patch: (post: NewsPost) => NewsPost,
): void {
  queryClient.setQueryData<NewsPost>(queryKeys.newsPost(postId), (post) =>
    post ? patch(post) : post,
  );
}

/** `mine` chỉ đổi khi chính mình bấm; sự kiện của người khác giữ nguyên lựa chọn của mình */
export function applyNewsReactions(
  queryClient: QueryClient,
  postId: string,
  summary: Omit<NewsReactionSummary, 'mine'> & { mine?: NewsReactionSummary['mine'] },
): void {
  patchNewsPost(queryClient, postId, (post) => ({
    ...post,
    reactions: {
      total: summary.total,
      counts: summary.counts,
      top: summary.top,
      mine: summary.mine === undefined ? post.reactions.mine : summary.mine,
    },
  }));
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
  patchNewsPost(queryClient, postId, (post) => ({ ...post, commentCount }));
  patchNewsFeedPost(queryClient, postId, (post) => ({ ...post, commentCount }));
}
