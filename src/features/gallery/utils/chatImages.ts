import type { ChatMessage } from '@/types';

/** Ảnh trong tin nhắn đưa được lên thư viện. BE vẫn từ chối GIF Tenor và ảnh đã thu hồi */
export function chatImagesOf(message: ChatMessage): { id: string; url: string }[] {
  if (message.recalled) {
    return [];
  }
  const images = message.images?.length
    ? message.images
    : message.imageId && message.imageUrl
      ? [{ id: message.imageId, url: message.imageUrl }]
      : [];
  return images.filter((image) => !image.url.includes('tenor.com'));
}
