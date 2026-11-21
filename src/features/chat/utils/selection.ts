import type { ChatMessage } from '@/types';

export function isSelectable(message: ChatMessage): boolean {
  // Tin tạm chưa có id thật thì chưa chuyển tiếp/xóa được
  return message.role !== 'system' && !message.recalled && !message.sendState;
}
