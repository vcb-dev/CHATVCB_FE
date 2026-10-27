import { PushpinOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { useMemo } from 'react';
import type { ChatMessage } from '@/types';

function pinPreview(item: ChatMessage) {
  if (item.recalled) {
    return 'Tin nhắn đã được thu hồi';
  }
  return (
    item.content.trim() ||
    (item.fileName ? `[Tệp] ${item.fileName}` : '') ||
    (item.imageUrl ? '[Ảnh]' : 'Tin đã ghim')
  );
}

export function PinBar(props: {
  pins: ChatMessage[];
  onJump: (id: string, createdAt?: string) => Promise<void>;
}) {
  const headerPins = useMemo(
    () => props.pins.filter((item) => item.pinned && !item.recalled),
    [props.pins],
  );
  const latestPin = headerPins[0];

  if (!latestPin) {
    return null;
  }
  return (
    <div className="pin-bar">
      <button type="button" className="pin-bar-main" onClick={() => void props.onJump(latestPin.id, latestPin.createdAt)}>
        <PushpinOutlined />
        <span>
          <strong>{latestPin.authorName}</strong>
          {pinPreview(latestPin)}
        </span>
      </button>
      {headerPins.length > 1 ? (
        <Popover
          trigger="click"
          placement="bottomRight"
          title={`${headerPins.length} tin đã ghim`}
          content={
            <div className="pin-bar-list">
              {headerPins.map((item) => (
                <button key={item.id} type="button" onClick={() => void props.onJump(item.id, item.createdAt)}>
                  <strong>{item.authorName}</strong>
                  <small>{pinPreview(item)}</small>
                </button>
              ))}
            </div>
          }
        >
          <button type="button" className="pin-bar-count">
            {headerPins.length}
          </button>
        </Popover>
      ) : null}
    </div>
  );
}
