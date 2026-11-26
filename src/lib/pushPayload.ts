// Dùng chung cho app và Service Worker (src/sw.ts): không import gì của DOM ở đây.

/** Mã BE ký cho nút "Từ chối" (đúng một cuộc gọi, một người, khoảng một phút) */
export type PushCallAction = {
  id: string;
  userId: string;
  exp: number;
  sig: string;
};

/** Nội dung BE gửi qua Web Push (khớp `PushPayload` ở CHATVCB_BE src/push/push.service.ts). */
export type PushPayload = {
  title: string;
  body: string;
  /** Cùng tag thì thông báo mới thay thông báo cũ: `room-<roomId>` cho tin nhắn, `call-<callId>` cho cuộc gọi */
  tag?: string;
  roomId?: string;
  /** Cuộc gọi đến: giữ thông báo tới khi người dùng bấm/vuốt */
  requireInteraction?: boolean;
  /** Thay thông báo cũ mà không kêu/rung (vd "Đã nghe máy" thay "Đang gọi…") */
  silent?: boolean;
  /** Cuộc gọi đến: hiện nút Nghe / Từ chối */
  call?: PushCallAction;
};

/** SW → trang khi bấm thông báo lúc app đang mở */
export const OPEN_ROOM_MESSAGE = 'chatvcb:open-room';

/** SW → trang: bấm "Nghe" trên thông báo cuộc gọi lúc app đang mở */
export const ANSWER_CALL_MESSAGE = 'chatvcb:answer-call';

/** Tham số URL khi bấm "Nghe" lúc app đã đóng: `/?room=<roomId>&answer=<callId>` */
export const ANSWER_CALL_PARAM = 'answer';
