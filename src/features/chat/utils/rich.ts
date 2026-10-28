import type { RichPayload } from '@/types';

/** Nhãn ngắn cho danh sách hội thoại, thông báo, trích dẫn. */
export function richLabel(rich: RichPayload): string {
  if (rich.type === 'sticker') {
    return '[Sticker]';
  }
  return rich.type === 'location' ? '[Vị trí]' : '[Danh thiếp]';
}
