// Khớp CHAT_FILE_DIRECT_MAX_BYTES ở BE (src/chat/constants/chat.constants.ts): tệp chat tải thẳng lên R2.
// 2.000.000.000 byte chứ không phải 2 GiB vì cột dung lượng ở BE là số nguyên 32-bit
export const CHAT_FILE_MAX_BYTES = 2_000_000_000;

export const CHAT_FILE_MAX_TEXT = 'Tệp tối đa 2 GB.';

// Khớp CHAT_FILE_MAX_BYTES ở BE: đường cũ gửi multipart qua BE, dùng khi trình duyệt không PUT thẳng lên R2 được
// (app Mac chạy file://, R2 chưa bật CORS, BE chưa cấu hình R2)
export const CHAT_FILE_LEGACY_MAX_BYTES = 200 * 1024 * 1024;
