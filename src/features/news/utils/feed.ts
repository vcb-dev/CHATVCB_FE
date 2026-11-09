import type { NewsCard, NewsImage, NewsPost } from '@/types';

export const NEWS_FEED_PAGE = 10;
export const NEWS_GRID_MAX = 5;

export type FeedImage = {
  image: NewsImage;
  caption: string;
};

export function feedImages(
  post: Pick<NewsPost, 'cover' | 'blocks' | 'images'>,
): FeedImage[] {
  const imagesById = new Map<string, NewsImage>();
  for (const img of post.images) {
    imagesById.set(img.id, img);
  }
  if (post.cover) {
    imagesById.set(post.cover.id, post.cover);
  }

  const captionById = new Map<string, string>();
  const orderedIds: string[] = [];
  const seen = new Set<string>();

  if (post.cover && imagesById.has(post.cover.id)) {
    seen.add(post.cover.id);
    orderedIds.push(post.cover.id);
  }

  for (const block of post.blocks) {
    if (block.type === 'image' && block.imageId && imagesById.has(block.imageId)) {
      if (!captionById.has(block.imageId)) {
        captionById.set(block.imageId, block.caption ?? '');
      }
      if (!seen.has(block.imageId)) {
        seen.add(block.imageId);
        orderedIds.push(block.imageId);
      }
    }
  }

  return orderedIds.map((id) => ({
    image: imagesById.get(id)!,
    caption: captionById.get(id) ?? '',
  }));
}

export type NewsPostAuthor = {
  name: string;
  avatarUrl: string;
  facebookUrl: string | null;
};

export function postAuthor(
  post: Pick<NewsCard, 'author' | 'source'>,
): NewsPostAuthor {
  return {
    name: post.source?.name ?? post.author?.name ?? 'Người dùng cũ',
    avatarUrl: post.source ? '' : post.author?.avatarUrl ?? '',
    facebookUrl: post.source?.url ?? null,
  };
}
