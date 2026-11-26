import {
  AudioMutedOutlined,
  DesktopOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import type { CallPeer } from '@/types';

type Props = {
  peer: CallPeer;
  stream?: MediaStream;
  pinned?: boolean;
  canPin?: boolean;
  avatarSize?: number;
  onTogglePin?: () => void;
};

export function CallRemoteTile({
  peer,
  stream,
  pinned = false,
  canPin = false,
  avatarSize = 72,
  onTogglePin,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = Boolean(
    stream &&
      (peer.camOn || peer.sharing) &&
      stream.getVideoTracks().some((t) => t.readyState === 'live'),
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    if (el.srcObject !== (stream ?? null)) {
      el.srcObject = stream ?? null;
    }
    if (stream) {
      el.playsInline = true;
      void el.play().catch(() => undefined);
    }
  }, [stream, showVideo]);

  return (
    <div
      className={[
        'call-tile',
        showVideo ? 'has-video' : 'no-video',
        peer.sharing ? 'is-sharing' : '',
        pinned ? 'is-pinned' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={showVideo ? 'call-tile-video' : 'call-tile-video is-hidden'}
      />
      {!showVideo ? (
        <div className="call-tile-avatar">
          <div className={peer.micOn ? 'call-avatar-pulse' : 'call-avatar-wrap'}>
            <UserAvatar
              size={avatarSize}
              src={peer.avatarUrl}
              name={peer.name}
              zoomable={false}
            />
          </div>
          <strong className="call-tile-name">{peer.name}</strong>
          <small className="call-tile-status">
            {peer.micOn ? 'Đang kết nối thoại' : 'Đã tắt micro'}
          </small>
        </div>
      ) : null}

      <div className="call-tile-foot">
        <span className="call-tile-badge">
          {!peer.micOn ? <AudioMutedOutlined className="is-muted" /> : null}
          {peer.sharing ? <DesktopOutlined /> : null}
          <span>{peer.name}</span>
        </span>
        {canPin && onTogglePin ? (
          <Tooltip title={pinned ? 'Bỏ ghim' : 'Ghim màn hình'}>
            <button
              type="button"
              className={pinned ? 'call-tile-pin is-active' : 'call-tile-pin'}
              aria-label={pinned ? 'Bỏ ghim' : 'Ghim màn hình'}
              onClick={onTogglePin}
            >
              <PushpinOutlined />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
