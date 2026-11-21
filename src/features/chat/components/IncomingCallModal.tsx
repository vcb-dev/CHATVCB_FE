import {
  CloseOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useEffect } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import type { CallIncomingEvent } from '@/types';

type Props = {
  incoming: CallIncomingEvent | null;
  onAccept: (withVideo: boolean) => void;
  onReject: () => void;
};

export function IncomingCallModal({ incoming, onAccept, onReject }: Props) {
  const callId = incoming?.callId;
  // App desktop chạy nền: nảy icon Dock / nháy thanh tác vụ tới khi popup đóng (nghe, từ chối, hết chuông)
  useEffect(() => {
    if (!callId) {
      return;
    }
    window.chatvcb?.callAlert?.(true);
    return () => window.chatvcb?.callAlert?.(false);
  }, [callId]);

  if (!incoming) {
    return null;
  }
  const isVideo = incoming.mode === 'video';
  const isGroup = incoming.kind === 'group';
  const displayName = isGroup ? incoming.roomTitle : incoming.callerName;
  const displayAvatar = isGroup ? incoming.roomAvatarUrl : incoming.callerAvatarUrl;
  const subtitle = isGroup
    ? `${incoming.callerName} đang gọi ${isVideo ? 'video' : 'thoại'} trong nhóm`
    : isVideo
      ? 'Cuộc gọi video đến...'
      : 'Cuộc gọi thoại đến...';

  return (
    <div
      className="call-incoming-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Cuộc gọi đến"
    >
      <div className="call-incoming-card">
        <div className="call-incoming-ring">
          <UserAvatar
            size={76}
            src={displayAvatar}
            name={displayName}
            zoomable={false}
          />
        </div>
        <div className="call-incoming-info">
          <strong className="call-incoming-name">{displayName}</strong>
          <span className="call-incoming-sub">{subtitle}</span>
        </div>
        <div className="call-incoming-actions">
          <Tooltip title="Từ chối">
            <button
              type="button"
              className="call-action-circle is-reject"
              aria-label="Từ chối cuộc gọi"
              onClick={onReject}
            >
              <CloseOutlined />
              <small>Từ chối</small>
            </button>
          </Tooltip>
          {isVideo ? (
            <Tooltip title="Chỉ nghe thoại (tắt camera)">
              <button
                type="button"
                className="call-action-circle is-audio-only"
                aria-label="Chỉ nghe thoại"
                onClick={() => onAccept(false)}
              >
                <PhoneOutlined />
                <small>Nghe thoại</small>
              </button>
            </Tooltip>
          ) : null}
          <Tooltip title={isVideo ? 'Nghe video' : 'Nghe cuộc gọi'}>
            <button
              type="button"
              className="call-action-circle is-accept"
              aria-label={isVideo ? 'Nghe video' : 'Nghe cuộc gọi'}
              onClick={() => onAccept(isVideo)}
            >
              {isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
              <small>{isVideo ? 'Nghe video' : 'Nghe máy'}</small>
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
