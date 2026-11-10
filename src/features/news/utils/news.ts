import { ApiError } from '@/api/client';
import type { NewsReactionKind } from '@/types';

export function isPostGone(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}


/** Khớp `NEWS_LIMITS` ở BE (`src/news/posts/news-blocks.ts`) */
export const NEWS_LIMITS = {
  blocks: 100,
  images: 30,
  title: 200,
  heading: 200,
  paragraph: 10000,
  caption: 300,
} as const;

/** Cùng thứ tự với `NEWS_REACTION_KINDS` ở BE */
export const NEWS_REACTIONS: { kind: NewsReactionKind; emoji: string; label: string; color: string }[] = [
  { kind: 'like', emoji: '👍', label: 'Thích', color: '#1677ff' },
  { kind: 'love', emoji: '❤️', label: 'Yêu thích', color: '#f5222d' },
  { kind: 'haha', emoji: '😂', label: 'Haha', color: '#d48806' },
  { kind: 'wow', emoji: '😮', label: 'Wow', color: '#d48806' },
  { kind: 'sad', emoji: '😢', label: 'Buồn', color: '#d48806' },
  { kind: 'angry', emoji: '😡', label: 'Phẫn nộ', color: '#d4380d' },
];

export function reactionOf(kind: NewsReactionKind) {
  return NEWS_REACTIONS.find((item) => item.kind === kind) ?? NEWS_REACTIONS[0];
}

/** Khớp giới hạn bình luận ở BE (`src/news/comments/news-comments.service.ts`) */
export const NEWS_COMMENT_MAX = 2000;

/** Định dạng `dd/mm/yyyy hh:mm` kiểu `vi-VN` */
export function newsDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Vừa xong", "5 phút", "3 giờ", quá một ngày thì ghi ngày giờ */
export function newsTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return 'Vừa xong';
  }
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)} giờ`;
  }
  return newsDateTime(value);
}

export function newsDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('vi-VN') : 'Nháp';
}
