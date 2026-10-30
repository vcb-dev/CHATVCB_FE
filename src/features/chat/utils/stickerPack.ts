export type StickerItem = { id: string; emoji: string; text: string; bg: string };

// Bộ sticker dựng sẵn: emoji lớn kèm chữ. Chỉ `id` được gửi đi, nội dung hiển thị nằm ở đây.
export const STICKER_PACK: StickerItem[] = [
  { id: 'ok-nha', emoji: '👌', text: 'Ok nha', bg: '#d6f0ff' },
  { id: 'cam-on', emoji: '🙏', text: 'Cảm ơn', bg: '#ffe9c7' },
  { id: 'xin-loi', emoji: '🥺', text: 'Xin lỗi', bg: '#ffe0e6' },
  { id: 'tuyet-voi', emoji: '🤩', text: 'Tuyệt vời', bg: '#fff3b8' },
  { id: 'dang-ban', emoji: '😵‍💫', text: 'Đang bận', bg: '#e6dcff' },
  { id: 'dang-hop', emoji: '💼', text: 'Đang họp', bg: '#dfe7f2' },
  { id: 'cho-chut', emoji: '⏳', text: 'Chờ chút', bg: '#ffeccf' },
  { id: 'da-ro', emoji: '🫡', text: 'Đã rõ', bg: '#d9f5df' },
  { id: 'hoan-ho', emoji: '🎉', text: 'Hoan hô', bg: '#ffd9ec' },
  { id: 'chao-sang', emoji: '☀️', text: 'Chào buổi sáng', bg: '#fff0b3' },
  { id: 'ngu-ngon', emoji: '😴', text: 'Ngủ ngon', bg: '#dcd9ff' },
  { id: 'haha', emoji: '😂', text: 'Haha', bg: '#ffeab0' },
  { id: 'buon-qua', emoji: '😭', text: 'Buồn quá', bg: '#d4e9ff' },
  { id: 'gian-roi', emoji: '😡', text: 'Giận rồi', bg: '#ffd5d0' },
  { id: 'yeu-qua', emoji: '😍', text: 'Yêu quá', bg: '#ffd6e8' },
  { id: 'dong-y', emoji: '👍', text: 'Đồng ý', bg: '#d6f5e0' },
  { id: 'khong-nha', emoji: '🙅', text: 'Không nha', bg: '#ffe0cf' },
  { id: 'di-an', emoji: '🍜', text: 'Đi ăn thôi', bg: '#ffe7c2' },
  { id: 'co-len', emoji: '💪', text: 'Cố lên', bg: '#e1f3c8' },
  { id: 'xong-roi', emoji: '✅', text: 'Xong rồi', bg: '#d2f2e3' },
  { id: 'chuc-mung', emoji: '🥳', text: 'Chúc mừng', bg: '#f6d9ff' },
  { id: 'lam-on', emoji: '🥹', text: 'Làm ơn', bg: '#ffe3e3' },
  { id: 'bat-ngo', emoji: '😱', text: 'Bất ngờ chưa', bg: '#d9ecff' },
  { id: 'tam-biet', emoji: '👋', text: 'Tạm biệt', bg: '#e8e3d5' },
];

export function findSticker(id: string): StickerItem | undefined {
  return STICKER_PACK.find((item) => item.id === id);
}
