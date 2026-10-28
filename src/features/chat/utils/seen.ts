import type { ChatMessage, RoomMember, RoomRead } from '@/types';

export type Delivery = 'sent' | 'delivered';

/** Nhóm: ai đã đọc / chưa đọc một tin của mình (không tính mình). */
export type Receipt = {
  read: RoomMember[];
  unread: RoomMember[];
};

export type Seen = {
  /** Những người đã đọc tới tin này (trừ người gửi). */
  viewersOf: (message: ChatMessage) => RoomRead[];
  /** Avatar “đã xem” nằm dưới tin nhắn của mình mà đối phương đọc tới, không phải tin họ vừa click. */
  lastSeenOn: (message: ChatMessage) => RoomRead[];
  /** "Đã gửi"/"Đã nhận" dưới tin cuối của mình khi chưa ai xem; đã có người xem thì dùng avatar "đã xem". */
  deliveryOf: (message: ChatMessage) => Delivery | null;
  /** Đã đọc / chưa đọc của một tin mình gửi trong nhóm; null nếu không phải tin của mình hoặc nhóm không có ai khác. */
  receiptOf: (message: ChatMessage) => Receipt | null;
};

/**
 * Chỉ số tin cuối cùng mà người này đã đọc tới (-1: chưa đọc tin nào trong danh sách đang tải).
 * Mọi tin có chỉ số <= giá trị này coi là đã đọc. Một người đã đọc tin nếu:
 * - tin họ đánh dấu đọc xong nằm sau tin đó, hoặc
 * - chính họ đã nhắn tin sau tin đó (trả lời nghĩa là đã đọc), hoặc
 * - không tìm thấy tin đánh dấu trong danh sách nhưng mốc `lastReadAt` của họ đã qua giờ gửi tin.
 */
function readThroughIndex(
  read: RoomRead,
  messages: ChatMessage[],
  indexOf: Map<string, number>,
): number {
  const readIdx = read.lastReadMessageId ? (indexOf.get(read.lastReadMessageId) ?? -1) : -1;
  let through = readIdx;
  if (read.userId) {
    for (let i = messages.length - 1; i > through; i -= 1) {
      if (messages[i].userId === read.userId) {
        through = i;
        break;
      }
    }
  }
  if (readIdx < 0 && read.lastReadAt) {
    const readAt = new Date(read.lastReadAt).getTime();
    for (let i = messages.length - 1; i > through; i -= 1) {
      if (new Date(messages[i].createdAt).getTime() <= readAt) {
        through = i;
        break;
      }
    }
  }
  return through;
}

/**
 * Tính một lần cho cả danh sách tin rồi tra từng tin, thay vì dò lại toàn bộ danh sách ở mỗi tin
 * (bản cũ tốn O(tin³ × người) mỗi lần vẽ). Kết quả mỗi tin được nhớ trong bảng nên mảng trả về giữ nguyên danh tính.
 */
export function buildSeen(
  messages: ChatMessage[],
  reads: RoomRead[],
  members: RoomMember[],
  myId: string,
): Seen {
  const indexOf = new Map<string, number>();
  messages.forEach((message, index) => indexOf.set(message.id, index));
  const through = reads.map((read) => readThroughIndex(read, messages, indexOf));

  // Với mỗi vị trí: chỉ số tin của mình gần nhất tính tới đó
  const lastOwnUpTo: number[] = [];
  let lastOwn = -1;
  messages.forEach((message, index) => {
    if (message.userId === myId) {
      lastOwn = index;
    }
    lastOwnUpTo.push(lastOwn);
  });
  const lastMine = [...messages]
    .reverse()
    .find((item) => item.userId === myId && item.role === 'user' && !item.recalled);

  const viewersCache = new Map<string, RoomRead[]>();
  const lastSeenCache = new Map<string, RoomRead[]>();
  const receiptCache = new Map<string, Receipt | null>();

  // Mốc đọc của từng thành viên; người chưa có dòng đọc nào vẫn tính (họ có thể đã nhắn tin trong nhóm)
  const memberThrough = new Map<string, number>();
  const readByUser = new Map(reads.map((read, index) => [read.userId, index]));
  for (const member of members) {
    const at = readByUser.get(member.id);
    memberThrough.set(
      member.id,
      at !== undefined
        ? through[at]
        : readThroughIndex(
            { userId: member.id, name: member.name, lastReadMessageId: null, lastReadAt: null },
            messages,
            indexOf,
          ),
    );
  }

  const viewersOf: Seen['viewersOf'] = (message) => {
    let cached = viewersCache.get(message.id);
    if (!cached) {
      const idx = indexOf.get(message.id) ?? -1;
      cached = idx < 0
        ? []
        : reads.filter((read, i) => read.userId !== message.userId && idx <= through[i]);
      viewersCache.set(message.id, cached);
    }
    return cached;
  };

  const lastSeenOn: Seen['lastSeenOn'] = (message) => {
    if (message.userId !== myId) {
      return [];
    }
    let cached = lastSeenCache.get(message.id);
    if (!cached) {
      const idx = indexOf.get(message.id) ?? -1;
      cached = idx < 0
        ? []
        : reads.filter(
            (read, i) =>
              read.userId !== myId && idx <= through[i] && lastOwnUpTo[through[i]] === idx,
          );
      lastSeenCache.set(message.id, cached);
    }
    return cached;
  };

  const deliveryOf: Seen['deliveryOf'] = (message) => {
    if (message.userId !== myId || message.role !== 'user' || message.recalled) {
      return null;
    }
    if (lastMine?.id !== message.id || viewersOf(message).length > 0) {
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
  };

  const receiptOf: Seen['receiptOf'] = (message) => {
    if (message.userId !== myId || message.role !== 'user' || message.recalled) {
      return null;
    }
    let cached = receiptCache.get(message.id);
    if (cached === undefined) {
      const idx = indexOf.get(message.id) ?? -1;
      const others = members.filter((member) => member.id !== myId);
      if (idx < 0 || others.length === 0) {
        cached = null;
      } else {
        const read: RoomMember[] = [];
        const unread: RoomMember[] = [];
        for (const member of others) {
          (idx <= (memberThrough.get(member.id) ?? -1) ? read : unread).push(member);
        }
        cached = { read, unread };
      }
      receiptCache.set(message.id, cached);
    }
    return cached;
  };

  return { viewersOf, lastSeenOn, deliveryOf, receiptOf };
}
