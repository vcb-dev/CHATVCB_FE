import { api } from '@/api/client';
import type { ChatMessage } from '@/types';
import { isVoice } from './attachments';

export const MAX_FORWARD_TARGETS = 10;

export function canForward(message: ChatMessage): boolean {
  return (
    !message.recalled &&
    Boolean(message.content.trim() || message.imageUrl || message.fileUrl) &&
    !isVoice(message)
  );
}

export async function forwardMessage(message: ChatMessage, roomId: string): Promise<ChatMessage> {
  if ((message.images ?? []).length > 1) {
    const ids: string[] = [];
    for (const image of message.images ?? []) {
      const res = await api.attachRemoteImage(roomId, image.url);
      ids.push(res.id);
    }
    return api.sendMessage(roomId, message.content, undefined, undefined, undefined, ids);
  }

  let imageId: string | undefined;
  if (message.imageUrl) {
    if (message.imageUrl.startsWith('https://')) {
      const res = await api.attachRemoteImage(roomId, message.imageUrl);
      imageId = res.id;
    } else {
      const blob = await api.download(message.imageUrl);
      const file = new File([blob], 'anh', { type: blob.type });
      const res = await api.uploadImage(roomId, file);
      imageId = res.id;
    }
  }

  let fileId: string | undefined;
  if (message.fileUrl) {
    const blob = await api.download(message.fileUrl);
    const file = new File([blob], message.fileName ?? 'tep', {
      type: message.fileMimeType ?? blob.type,
    });
    const res = await api.uploadFile(roomId, file);
    fileId = res.id;
  }

  return api.sendMessage(roomId, message.content, imageId, undefined, fileId);
}
