import { useState } from 'react';
import { Button, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { markNotifyAsked, shouldAskNotify, toggleNotify } from '@/lib/notify';

/**
 * Hỏi bật thông báo một lần, khi trình duyệt chưa được hỏi. App không tự xin quyền lúc mở nữa
 * (iPhone chặn xin quyền không do người dùng chạm), nên đây là đường chính để người mới bật thông báo.
 */
export function NotifyPrompt() {
  const [show, setShow] = useState(shouldAskNotify);
  if (!show) {
    return null;
  }
  const close = () => {
    markNotifyAsked();
    setShow(false);
  };
  return (
    <div className="notify-prompt" role="dialog" aria-label="Bật thông báo">
      <BellOutlined className="notify-prompt-icon" />
      <span className="notify-prompt-text">
        Bật thông báo để nhận tin nhắn và cuộc gọi khi không mở CHATVCB.
      </span>
      <Button
        type="primary"
        size="small"
        onClick={() => {
          close();
          void toggleNotify(true).then((on) => {
            if (!on) {
              void message.warning('Chưa bật được. Bạn có thể bật lại trong menu ☰ → Thông báo tin nhắn.');
            }
          });
        }}
      >
        Bật
      </Button>
      <Button type="text" size="small" onClick={close}>
        Để sau
      </Button>
    </div>
  );
}
