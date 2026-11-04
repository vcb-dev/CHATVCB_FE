/** Khớp `NEWS_LIMITS` ở BE (`src/news/news-blocks.ts`) */
export const NEWS_LIMITS = {
  blocks: 100,
  title: 200,
  heading: 200,
  paragraph: 10000,
  caption: 300,
} as const;

export function newsDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('vi-VN') : 'Nháp';
}
