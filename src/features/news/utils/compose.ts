import type { NewsBlock, NewsImage, NewsPost } from '@/types';
import { NEWS_LIMITS } from './news';

/** Khớp `TITLE_MAX` ở BE (`src/news/facebook/facebook-post.ts`) */
const TITLE_MAX = 150;

export const COMPOSE_TOO_LONG = 'Bài quá dài, hãy rút gọn bớt.';

export type ComposedPost = {
  title: string;
  blocks: NewsBlock[];
  coverImageId: string | null;
};

/** Chép `cutTitle` của BE: bài gõ ở hộp đăng và bài kéo từ Facebook có tiêu đề cùng một kiểu */
function cutTitle(line: string): { title: string; complete: boolean } {
  if (line.length <= TITLE_MAX) {
    return { title: line, complete: true };
  }
  const head = line.slice(0, TITLE_MAX);
  const space = head.lastIndexOf(' ');
  return {
    title: `${(space > TITLE_MAX * 0.6 ? head.slice(0, space) : head).trimEnd()}…`,
    complete: false,
  };
}

function paragraphsOf(text: string): string[] {
  const parts: string[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    const part = raw.trim();
    for (let at = 0; at < part.length; at += NEWS_LIMITS.paragraph) {
      parts.push(part.slice(at, at + NEWS_LIMITS.paragraph));
    }
  }
  return parts;
}

function firstText(blocks: NewsBlock[]): string | null {
  for (const block of blocks) {
    if (block.type !== 'image') {
      return block.text;
    }
  }
  return null;
}

/** Tiêu đề chỉ là bản lặp của khối chữ đầu (bài một dòng, hoặc dòng đầu dài bị cắt thành "…") thì không đáng hiện riêng */
export function titleRepeats(title: string, blocks: NewsBlock[]): boolean {
  const head = title.trim();
  const first = firstText(blocks)?.trim();
  if (!head || first === undefined) {
    return false;
  }
  if (first === head) {
    return true;
  }
  return head.endsWith('…') && head.length > 1 && first.startsWith(head.slice(0, -1));
}

/** Dòng đầu làm tiêu đề, phần còn lại tách đoạn theo dòng trống, ảnh đầu làm ảnh bìa. Quá 100 khối thì ném lỗi `COMPOSE_TOO_LONG` */
export function composeToPost(
  text: string,
  images: NewsImage[],
  previousBlocks: NewsBlock[],
): ComposedPost {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  let title = '';
  let paragraphs: string[] = [];
  if (normalized) {
    const [line, ...rest] = normalized.split('\n');
    const firstLine = line.trim();
    const cut = cutTitle(firstLine);
    title = cut.title;
    paragraphs = paragraphsOf(cut.complete ? rest.join('\n') : normalized);
    // BE chỉ cho đăng khi có ít nhất một khối, nên bài một dòng lặp dòng đó làm đoạn văn; bảng tin ẩn tiêu đề lặp
    if (!paragraphs.length) {
      paragraphs = paragraphsOf(firstLine);
    }
  }

  const captions = new Map<string, string>();
  for (const block of previousBlocks) {
    if (block.type === 'image' && !captions.has(block.imageId)) {
      captions.set(block.imageId, block.caption);
    }
  }
  const blocks: NewsBlock[] = [
    ...paragraphs.map((part): NewsBlock => ({ type: 'paragraph', text: part })),
    ...images.slice(1).map((image): NewsBlock => ({
      type: 'image',
      imageId: image.id,
      caption: captions.get(image.id) ?? '',
    })),
  ];
  if (blocks.length > NEWS_LIMITS.blocks) {
    throw new Error(COMPOSE_TOO_LONG);
  }
  return { title, blocks, coverImageId: images[0]?.id ?? null };
}

/** Ngược lại của `composeToPost`: tiêu đề phụ của bài cũ thành một dòng thường */
export function postToCompose(post: Pick<NewsPost, 'title' | 'blocks'>): string {
  const body = post.blocks
    .flatMap((block) => (block.type === 'image' ? [] : [block.text]))
    .join('\n\n');
  if (!post.title || titleRepeats(post.title, post.blocks)) {
    return body;
  }
  return body ? `${post.title}\n${body}` : post.title;
}
