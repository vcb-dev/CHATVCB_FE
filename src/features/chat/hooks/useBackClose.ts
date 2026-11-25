import { useEffect, useRef } from 'react';

// Nút Back / vuốt cạnh của điện thoại (Android, app đã cài): mỗi lớp đang mở (phòng chat, menu, khung thông tin)
// đẩy một mục lịch sử có `chatvcbBack = độ sâu`; Back gỡ mục trên cùng nên lớp đó đóng thay vì thoát khỏi app.
const KEY = 'chatvcbBack';

// Số bước lùi đã gọi mà popstate chưa về: đóng nhiều lớp cùng lúc thì lớp sau không lùi thêm lần nữa
let pendingBack = 0;
window.addEventListener('popstate', () => {
  pendingBack = 0;
});

function depthNow() {
  const state = window.history.state as Record<string, unknown> | null;
  const depth = state?.[KEY];
  return typeof depth === 'number' ? depth : 0;
}

/**
 * Khi `open` (và `enabled`) thì Back của trình duyệt/điện thoại gọi `close`.
 * Đóng bằng nút trên màn hình thì tự gỡ mục lịch sử đã đẩy, để Back lần sau không bấm vào khoảng trống.
 */
export function useBackClose(open: boolean, close: () => void, enabled = true) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || !enabled) {
      return;
    }
    const depth = depthNow() - pendingBack + 1;
    const state = (window.history.state as Record<string, unknown> | null) ?? {};
    window.history.pushState({ ...state, [KEY]: depth }, '');
    let closedByBack = false;
    const onPop = () => {
      if (depthNow() < depth) {
        closedByBack = true;
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (closedByBack) {
        return;
      }
      const top = depthNow() - pendingBack;
      if (top >= depth) {
        const steps = top - depth + 1;
        pendingBack += steps;
        window.history.go(-steps);
      }
    };
  }, [open, enabled]);
}
