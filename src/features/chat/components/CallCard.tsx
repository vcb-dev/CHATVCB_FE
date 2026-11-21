import { PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { CallKind, CallMode, CallStatus } from '@/types';
import { dispatchCallCardAction, formatCallClock } from '../utils/callEvents';

type Props = {
  roomId: string;
  callId: string;
  mode: CallMode;
  kind: CallKind;
  status: CallStatus;
  durationSec?: number;
  mine: boolean;
};

export function CallCard({
  roomId,
  callId,
  mode,
  kind,
  status,
  durationSec,
  mine,
}: Props) {
  const isVideo = mode === 'video';
  const isGroup = kind === 'group';
  const isActive = status === 'active';
  const isMissed =
    status === 'missed' ||
    status === 'rejected' ||
    status === 'busy' ||
    (status === 'cancelled' && !mine);

  const title = isGroup
    ? isVideo
      ? 'Gọi video nhóm'
      : 'Gọi thoại nhóm'
    : isVideo
      ? 'Cuộc gọi video'
      : 'Cuộc gọi thoại';

  function statusText(): string {
    switch (status) {
      case 'active':
        return 'Đang diễn ra';
      case 'ended':
        return durationSec
          ? `Thời lượng · ${formatCallClock(durationSec)}`
          : 'Đã kết thúc';
      case 'missed':
        return mine ? 'Không có phản hồi' : 'Cuộc gọi nhỡ';
      case 'rejected':
        return mine ? 'Người nhận đã từ chối' : 'Đã từ chối';
      case 'busy':
        return 'Người nhận đang bận';
      case 'cancelled':
        return mine ? 'Đã hủy' : 'Cuộc gọi nhỡ';
    }
  }

  return (
    <div
      className={[
        'rich-call-card',
        isActive ? 'is-active' : '',
        isMissed ? 'is-missed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="rich-call-top">
        <span className="rich-call-ico">
          {isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
        </span>
        <div className="rich-call-meta">
          <strong>{title}</strong>
          <small>
            {isActive ? <span className="rich-call-live-dot" /> : null}
            {statusText()}
          </small>
        </div>
      </div>
      <Button
        type={isActive ? 'primary' : 'default'}
        size="small"
        block
        className="rich-call-btn"
        icon={isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
        onClick={() =>
          dispatchCallCardAction(
            isActive
              ? { action: 'join', callId, roomId, mode }
              : { action: 'redial', roomId, mode },
          )
        }
      >
        {isActive ? 'Tham gia ngay' : 'Gọi lại'}
      </Button>
    </div>
  );
}
