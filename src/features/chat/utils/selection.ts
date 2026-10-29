import type { ChatMessage } from '@/types';

export function isSelectable(message: ChatMessage): boolean {
  return message.role !== 'system' && !message.recalled;
}
