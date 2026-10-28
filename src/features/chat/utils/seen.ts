import type { ChatMessage, RoomRead } from '@/types';

function messageIndex(messages: ChatMessage[], id: string | null) {
  if (!id) {
    return -1;
  }
  return messages.findIndex((item) => item.id === id);
}

function hasReadThrough(
  read: RoomRead,
  messages: ChatMessage[],
  targetIdx: number,
  target: ChatMessage,
) {
  const readIdx = messageIndex(messages, read.lastReadMessageId);
  if (targetIdx >= 0 && readIdx >= 0 && readIdx >= targetIdx) {
    return true;
  }
  if (targetIdx >= 0 && read.userId) {
    const repliedAfter = messages.some(
      (item, index) => item.userId === read.userId && index >= targetIdx,
    );
    if (repliedAfter) {
      return true;
    }
  }
  if (readIdx < 0 && read.lastReadAt) {
    return new Date(read.lastReadAt).getTime() >= new Date(target.createdAt).getTime();
  }
  return false;
}

export function viewersOf(
  message: ChatMessage,
  messages: ChatMessage[],
  reads: RoomRead[],
) {
  const msgIdx = messageIndex(messages, message.id);
  return reads.filter((read) => {
    if (read.userId === message.userId) {
      return false;
    }
    return hasReadThrough(read, messages, msgIdx, message);
  });
}

/** Avatar “đã xem” nằm dưới tin nhắn của mình mà đối phương đọc tới, không phải tin họ vừa click. */
export function lastSeenOn(
  message: ChatMessage,
  messages: ChatMessage[],
  reads: RoomRead[],
  myId: string,
) {
  if (message.userId !== myId) {
    return [];
  }
  const msgIdx = messageIndex(messages, message.id);
  return reads.filter((read) => {
    if (read.userId === myId) {
      return false;
    }
    if (!hasReadThrough(read, messages, msgIdx, message)) {
      return false;
    }
    return !messages.some((other, index) => {
      if (other.userId !== myId || index <= msgIdx) {
        return false;
      }
      return hasReadThrough(read, messages, index, other);
    });
  });
}

export type Delivery = 'sent' | 'delivered';

/** "Đã gửi"/"Đã nhận" dưới tin cuối của mình khi chưa ai xem; đã có người xem thì dùng avatar "đã xem". */
export function deliveryOf(
  message: ChatMessage,
  messages: ChatMessage[],
  reads: RoomRead[],
  myId: string,
): Delivery | null {
  if (message.userId !== myId || message.role !== 'user' || message.recalled) {
    return null;
  }
  const lastMine = [...messages]
    .reverse()
    .find((item) => item.userId === myId && item.role === 'user' && !item.recalled);
  if (lastMine?.id !== message.id) {
    return null;
  }
  if (viewersOf(message, messages, reads).length > 0) {
    return null;
  }
  const sentAt = new Date(message.createdAt).getTime();
  const delivered = reads.some(
    (read) =>
      read.userId !== myId &&
      Boolean(read.lastDeliveredAt) &&
      new Date(read.lastDeliveredAt as string).getTime() >= sentAt,
  );
  return delivered ? 'delivered' : 'sent';
}
