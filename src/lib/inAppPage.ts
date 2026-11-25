// Trang con theo hash (#/meet, #/sheet) khi chạy như app đã cài trên điện thoại: window.open(_blank) sẽ văng ra
// trình duyệt (mất phiên đăng nhập của app), nên mở ngay trong app và quay lại bằng lịch sử.
import { Modal } from 'antd';

const KEY = 'chatvcbInApp';

let inCall = false;

/** useChatCall báo đang có cuộc gọi: rời khung chat (ChatPage bị gỡ) sẽ cúp máy */
export function setInCall(on: boolean) {
  inCall = on;
}

export function openInAppPage(hash: string) {
  const go = () => {
    // pushState không bắn hashchange: tự báo để App đổi màn
    window.history.pushState({ [KEY]: true }, '', `#${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  if (!inCall) {
    go();
    return;
  }
  Modal.confirm({
    title: 'Đang trong cuộc gọi',
    content: 'Mở trang này sẽ kết thúc cuộc gọi hiện tại.',
    okText: 'Vẫn mở',
    cancelText: 'Ở lại',
    onOk: go,
  });
}

/** Rời trang con: đã mở bằng openInAppPage thì lùi lịch sử, để Back sau đó không mở lại trang con */
export function closeInAppPage() {
  const state = window.history.state as Record<string, unknown> | null;
  if (state?.[KEY]) {
    window.history.back();
    return;
  }
  window.location.hash = '';
}
