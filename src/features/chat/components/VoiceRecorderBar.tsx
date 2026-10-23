import { Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

export interface VoiceRecorderBarProps {
  elapsedMs: number;
  onCancel: () => void;
  onSend: () => void;
}

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function VoiceRecorderBar({ elapsedMs, onCancel, onSend }: VoiceRecorderBarProps) {
  return (
    <div className="voice-recorder-bar">
      <div className="voice-recorder-status">
        <span className="rec-dot" />
        <span className="rec-time">{formatMs(elapsedMs)}</span>
      </div>
      <div className="voice-recorder-actions">
        <Button type="text" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="primary" icon={<SendOutlined />} onClick={onSend}>
          Gửi
        </Button>
      </div>
    </div>
  );
}
