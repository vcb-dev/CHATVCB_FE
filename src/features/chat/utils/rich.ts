import type { RichPayload } from '@/types';

/** Nhãn ngắn cho danh sách hội thoại, thông báo, trích dẫn. */
export function richLabel(rich: RichPayload): string {
  if (rich.type === 'sticker') {
    return '[Sticker]';
  }
  if (rich.type === 'meeting') {
    return '[Cuộc họp]';
  }
  if (rich.type === 'call') {
    return rich.mode === 'video' ? '[Cuộc gọi video]' : '[Cuộc gọi thoại]';
  }
  return rich.type === 'location' ? '[Vị trí]' : '[Danh thiếp]';
}
