// Kiểu dữ liệu Web Push, dùng chung cho app và Service Worker (src/sw.ts): không import gì của DOM ở đây.
// Hằng số (tên tin nhắn SW → trang, icon, thời gian chờ…) ở src/lib/pwaConstants.ts.

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
