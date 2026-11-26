// Dùng chung cho app và Service Worker (src/sw.ts): không import gì của DOM ở đây.

/** Nội dung BE gửi qua Web Push (khớp `PushPayload` ở CHATVCB_BE src/push/push.service.ts). */
export type PushPayload = {
  title: string;
  body: string;
  /** Cùng tag thì thông báo mới thay thông báo cũ: `room-<roomId>` cho tin nhắn, `call-<callId>` cho cuộc gọi */
  tag?: string;
  roomId?: string;
  /** Cuộc gọi đến: giữ thông báo tới khi người dùng bấm/vuốt */
  requireInteraction?: boolean;
};

/** SW → trang khi bấm thông báo lúc app đang mở */
export const OPEN_ROOM_MESSAGE = 'chatvcb:open-room';
