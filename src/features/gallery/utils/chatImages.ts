import type { ChatMessage } from '@/types';

/** GIF chọn từ kho online chỉ là link ngoài, BE không cho đưa lên thư viện */
const ONLINE_GIF_HOSTS = ['tenor.com', 'klipy.com'];

/** Ảnh trong tin nhắn đưa được lên thư viện. BE vẫn từ chối GIF online và ảnh đã thu hồi */
export function chatImagesOf(message: ChatMessage): { id: string; url: string }[] {
  if (message.recalled) {
    return [];
  }
  const images = message.images?.length
    ? message.images
    : message.imageId && message.imageUrl
      ? [{ id: message.imageId, url: message.imageUrl }]
      : [];
  return images.filter((image) => !ONLINE_GIF_HOSTS.some((host) => image.url.includes(host)));
}
