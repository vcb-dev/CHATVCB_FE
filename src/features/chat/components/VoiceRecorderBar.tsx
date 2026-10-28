import { Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { formatDuration } from '../utils/datetime';

export type VoiceRecorderBarProps = {
  elapsedMs: number;
  onCancel: () => void;
  onSend: () => void;
};

export function VoiceRecorderBar({ elapsedMs, onCancel, onSend }: VoiceRecorderBarProps) {
  return (
    <div className="voice-recorder-bar">
      <div className="voice-recorder-status">
        <span className="rec-dot" />
        <span className="rec-time">{formatDuration(elapsedMs)}</span>
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
