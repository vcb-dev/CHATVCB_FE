import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import type { NewsCard, NewsCardPage, NewsPost, NewsReactionSummary } from '@/types';

/** Sửa thẳng thẻ bài trong cache danh sách, để mỗi lượt thả cảm xúc không phải tải lại cả danh sách */
export function patchNewsCard(
  queryClient: QueryClient,
  postId: string,
  patch: (card: NewsCard) => NewsCard,
): void {
  queryClient.setQueriesData<InfiniteData<NewsCardPage>>({ queryKey: queryKeys.newsPosts }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === postId ? patch(item) : item)),
          })),
        }
      : data,
  );
}

export function patchNewsPost(
  queryClient: QueryClient,
  postId: string,
  patch: (post: NewsPost) => NewsPost,
): void {
  queryClient.setQueryData<NewsPost>(queryKeys.newsPost(postId), (post) => (post ? patch(post) : post));
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
  patchNewsCard(queryClient, postId, (card) => ({
    ...card,
    reactions: { total: summary.total, top: summary.top },
  }));
}

export function applyNewsCommentCount(queryClient: QueryClient, postId: string, commentCount: number): void {
  patchNewsPost(queryClient, postId, (post) => ({ ...post, commentCount }));
  patchNewsCard(queryClient, postId, (card) => ({ ...card, commentCount }));
}
