import type { ChatMessage } from '@/types';

// Khớp `unreadCountForRoom` của BE: tin của người khác (không phải Agent, không phải hệ thống)
// và tin nhắc hẹn đến giờ; bỏ tin đã thu hồi.
function countsAsUnread(message: ChatMessage, myId: string) {
  if (message.recalled) {
    return false;
  }
  if (message.systemKind === 'reminder.due') {
    return true;
  }
  return message.role === 'user' && message.userId !== null && message.userId !== myId;
}

/** Tin đầu tiên chưa đọc trong các tin đã tải; chưa đọc nhiều hơn số tải được thì trả tin đầu danh sách. */
export function firstUnreadId(
  messages: ChatMessage[],
  unreadCount: number,
  myId: string,
): string | null {
  if (unreadCount <= 0 || messages.length === 0) {
    return null;
  }
  let remaining = unreadCount;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (!countsAsUnread(messages[index], myId)) {
      continue;
    }
    remaining -= 1;
    if (remaining === 0) {
      return messages[index].id;
    }
  }
  return messages[0].id;
}
