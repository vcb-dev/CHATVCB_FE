import type { ChatMessage } from '@/types';

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEdit(message: ChatMessage, userId: string): boolean {
  return (
    message.userId === userId &&
    message.role === 'user' &&
    !message.recalled &&
    !message.poll &&
    !message.rich &&
    Boolean(message.content.trim()) &&
    Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS
  );
}
