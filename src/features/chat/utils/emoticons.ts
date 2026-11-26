/**
 * Mặt cười gõ tắt → emoji. Không có `XD` (dễ là "xây dựng") hay `8)`/`B)` (đánh số mục).
 */
const EMOTICONS: Record<string, string> = {
  ':)': '🙂',
  ':-)': '🙂',
  '=)': '🙂',
  ':))': '😆',
  '=))': '🤣',
  ':D': '😀',
  ':-D': '😀',
  ':(': '🙁',
  ':-(': '🙁',
  ':((': '😭',
  '=((': '😭',
  ":'(": '😢',
  ';)': '😉',
  ';-)': '😉',
  ':P': '😛',
  ':p': '😛',
  ':-P': '😛',
  ':O': '😮',
  ':o': '😮',
  ':*': '😘',
  ':/': '😕',
  ':|': '😐',
  '-_-': '😑',
  '^^': '😊',
  '^_^': '😊',
  'B-)': '😎',
  '8-)': '😎',
  '>:(': '😠',
  '<3': '❤️',
  '</3': '💔',
};

const LONGEST = Math.max(...Object.keys(EMOTICONS).map((key) => key.length));

const SPACE = /\s/;

/** Mặt cười gõ tắt kết thúc ở `end`, đứng riêng (đầu chữ hoặc sau khoảng trắng). */
function emoticonEndingAt(text: string, end: number) {
  let start = end;
  while (start > 0 && end - start < LONGEST && !SPACE.test(text[start - 1])) {
    start -= 1;
  }
  if (start > 0 && !SPACE.test(text[start - 1])) {
    return null;
  }
  const emoji = EMOTICONS[text.slice(start, end)];
  return emoji ? { start, emoji } : null;
}

/**
 * Vừa gõ đúng một khoảng trắng (cách, xuống dòng) ngay sau mặt cười gõ tắt thì đổi nó thành emoji.
 * Chữ dán vào (thêm nhiều ký tự một lúc) giữ nguyên. `caret` là vị trí con trỏ sau khi gõ.
 */
export function applyEmoticon(prev: string, next: string, caret: number) {
  if (next.length !== prev.length + 1 || caret < 1 || !SPACE.test(next[caret - 1])) {
    return null;
  }
  if (next.slice(0, caret - 1) + next.slice(caret) !== prev) {
    return null;
  }
  const hit = emoticonEndingAt(next, caret - 1);
  if (!hit) {
    return null;
  }
  return {
    text: next.slice(0, hit.start) + hit.emoji + next.slice(caret - 1),
    caret: hit.start + hit.emoji.length + 1,
  };
}

/** Lúc gửi: gõ `:)` rồi Enter luôn thì mặt cười ở cuối tin cũng được đổi. */
export function withTrailingEmoticon(text: string) {
  const hit = emoticonEndingAt(text, text.length);
  return hit ? text.slice(0, hit.start) + hit.emoji : text;
}
