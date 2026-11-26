// Hằng số của bản web cài như app (PWA): Service Worker, Web Push, nút trên thông báo cuộc gọi.
// Dùng chung cho app và Service Worker (src/sw.ts): chỉ khai giá trị, không import gì của DOM ở đây.

/** Icon thông báo */
export const PUSH_ICON = '/pwa-192.png';
/** Android vẽ icon nhỏ trên thanh trạng thái bằng kênh alpha: ảnh trắng nền trong suốt */
export const PUSH_BADGE = '/pwa-badge-96.png';

/** SW → trang khi bấm thông báo lúc app đang mở */
export const OPEN_ROOM_MESSAGE = 'chatvcb:open-room';
/** SW → trang: bấm "Nghe" trên thông báo cuộc gọi lúc app đang mở */
export const ANSWER_CALL_MESSAGE = 'chatvcb:answer-call';
/** Tham số URL khi bấm "Nghe" lúc app đã đóng: `/?room=<roomId>&answer=<callId>` */
export const ANSWER_CALL_PARAM = 'answer';

/** `action` của hai nút trên thông báo cuộc gọi đến */
export const CALL_ANSWER_ACTION = 'answer';
export const CALL_DECLINE_ACTION = 'decline';

/** Bấm "Nghe" lúc app đã đóng: chờ app tải + socket nối để BE gửi lại tín hiệu đổ chuông */
export const CALL_ANSWER_WAIT_MS = 20_000;

/** Chờ SW cài xong (`serviceWorker.ready`) trước khi đăng ký push; lần đầu cài có thể mất vài giây */
export const PUSH_READY_TIMEOUT_MS = 10_000;

/** Hỏi máy chủ có bản mới định kỳ, và không hỏi dồn khi quay lại app liên tục */
export const PWA_UPDATE_CHECK_MS = 60 * 60 * 1000;
export const PWA_UPDATE_CHECK_MIN_GAP_MS = 5 * 60 * 1000;
