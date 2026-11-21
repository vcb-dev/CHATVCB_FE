import {
  AudioMutedOutlined,
  AudioOutlined,
  CloseOutlined,
  CompressOutlined,
  DesktopOutlined,
  ExpandAltOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MessageOutlined,
  PhoneOutlined,
  SettingOutlined,
  TeamOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Popover, Select, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { listMediaDevices, type MediaDeviceList } from '@/features/meetings/meet';
import type { CallPeer, User } from '@/types';
import type { ActiveCallState } from '../hooks/useChatCall';
import { CallRemoteTile } from './CallRemoteTile';

type Props = {
  call: ActiveCallState | null;
  user: User;
  peers: CallPeer[];
  remoteStreams: Record<string, MediaStream>;
  localStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  minimized: boolean;
  pinnedId: string | null;
  audioDeviceId?: string;
  videoDeviceId?: string;
  elapsed: string;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onSelectAudioDevice: (deviceId: string) => void;
  onSelectVideoDevice: (deviceId: string) => void;
  onSetMinimized: (minimized: boolean) => void;
  onSetPinnedId: (id: string | null) => void;
  onOpenChatRoom: (roomId: string) => void;
  onLeave: () => void;
};

export function CallOverlay(props: Props) {
  const {
    call,
    user,
    peers,
    remoteStreams,
    localStream,
    micOn,
    camOn,
    sharing,
    minimized,
    pinnedId,
    audioDeviceId,
    videoDeviceId,
    elapsed,
  } = props;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceList>({ mics: [], cams: [] });

  const hasLocalVideo = Boolean(
    localStream &&
      (camOn || sharing) &&
      localStream.getVideoTracks().some((t) => t.readyState === 'live'),
  );

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) {
      return;
    }
    if (el.srcObject !== localStream) {
      el.srcObject = localStream;
    }
    if (localStream) {
      el.muted = true;
      el.playsInline = true;
      void el.play().catch(() => undefined);
    }
  }, [localStream, hasLocalVideo, minimized, expanded]);

  useEffect(() => {
    if (!deviceOpen) {
      return;
    }
    void listMediaDevices().then(setDevices);
  }, [deviceOpen]);

  if (!call) {
    return null;
  }

  const isConnected = peers.length > 0 || Boolean(call.connectedAt);
  const statusLabel = isConnected ? elapsed : 'Đang đổ chuông...';
  const sharingPeer = peers.find((p) => p.sharing);
  const spotlightPeer =
    (pinnedId ? peers.find((p) => p.socketId === pinnedId) : undefined) ?? sharingPeer;

  if (minimized) {
    const primaryPeer = spotlightPeer ?? peers[0];
    return (
      <div className="call-pip" role="region" aria-label="Cuộc gọi đang thu nhỏ">
        {/* Giữ các thẻ video/audio từ xa luôn phát tiếng ngay cả khi thu nhỏ */}
        <div className="call-pip-hidden-streams" aria-hidden="true">
          {peers.map((peer) => (
            <CallRemoteTile
              key={peer.socketId}
              peer={peer}
              stream={remoteStreams[peer.socketId]}
            />
          ))}
        </div>
        <div
          className="call-pip-main"
          onClick={() => props.onSetMinimized(false)}
          title="Bấm để mở rộng cửa sổ cuộc gọi"
        >
          <div className="call-pip-avatar">
            <UserAvatar
              size={40}
              src={primaryPeer?.avatarUrl || call.roomAvatarUrl}
              name={primaryPeer?.name || call.roomTitle}
              zoomable={false}
            />
            <span className="call-pip-live-dot" />
          </div>
          <div className="call-pip-text">
            <strong>{call.roomTitle}</strong>
            <small>
              {statusLabel}
              {call.kind === 'group' && peers.length > 0
                ? ` · ${peers.length + 1} người`
                : ''}
            </small>
          </div>
        </div>
        <div className="call-pip-actions">
          <Tooltip title={micOn ? 'Tắt micro' : 'Bật micro'}>
            <button
              type="button"
              className={micOn ? 'call-pip-btn' : 'call-pip-btn is-off'}
              aria-label={micOn ? 'Tắt micro' : 'Bật micro'}
              onClick={props.onToggleMic}
            >
              {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            </button>
          </Tooltip>
          <Tooltip title="Mở rộng cuộc gọi">
            <button
              type="button"
              className="call-pip-btn"
              aria-label="Mở rộng cuộc gọi"
              onClick={() => props.onSetMinimized(false)}
            >
              <ExpandAltOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Kết thúc cuộc gọi">
            <button
              type="button"
              className="call-pip-btn is-hangup"
              aria-label="Kết thúc cuộc gọi"
              onClick={props.onLeave}
            >
              <CloseOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <div
      className={expanded ? 'call-window is-expanded' : 'call-window'}
      role="dialog"
      aria-label={`Cuộc gọi với ${call.roomTitle}`}
    >
      <header className="call-window-head">
        <div className="call-window-title">
          <span className="call-window-mode-ico">
            {call.mode === 'video' || camOn || sharing ? (
              <VideoCameraOutlined />
            ) : (
              <PhoneOutlined />
            )}
          </span>
          <div>
            <strong>{call.roomTitle}</strong>
            <small>
              <span className={isConnected ? 'call-dot is-live' : 'call-dot'} />
              {statusLabel}
              {call.kind === 'group' ? (
                <span className="call-peer-count">
                  <TeamOutlined /> {peers.length + 1}
                </span>
              ) : null}
            </small>
          </div>
        </div>

        <div className="call-window-head-actions">
          <Tooltip title="Thu nhỏ để vừa gọi vừa nhắn tin">
            <button
              type="button"
              className="call-head-btn"
              aria-label="Vừa gọi vừa nhắn tin"
              onClick={() => {
                props.onOpenChatRoom(call.roomId);
                props.onSetMinimized(true);
              }}
            >
              <MessageOutlined />
            </button>
          </Tooltip>
          <Tooltip title={expanded ? 'Thu về cửa sổ nổi' : 'Phóng toàn khung'}>
            <button
              type="button"
              className="call-head-btn"
              aria-label={expanded ? 'Thu về cửa sổ nổi' : 'Phóng toàn khung'}
              onClick={() => setExpanded((cur) => !cur)}
            >
              {expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
          </Tooltip>
          <Tooltip title="Thu nhỏ xuống góc màn hình">
            <button
              type="button"
              className="call-head-btn"
              aria-label="Thu nhỏ cuộc gọi"
              onClick={() => props.onSetMinimized(true)}
            >
              <CompressOutlined />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="call-window-stage">
        {peers.length === 0 ? (
          <div className="call-dialing-stage">
            <div className="call-dialing-ring">
              <UserAvatar
                size={96}
                src={call.roomAvatarUrl}
                name={call.roomTitle}
                zoomable={false}
              />
            </div>
            <h3 className="call-dialing-name">{call.roomTitle}</h3>
            <p className="call-dialing-sub">
              {call.kind === 'group'
                ? 'Đang đổ chuông mời các thành viên trong nhóm...'
                : 'Đang đổ chuông, chờ người nhận bắt máy...'}
            </p>
          </div>
        ) : spotlightPeer && peers.length > 1 ? (
          <div className="call-spotlight-layout">
            <div className="call-spotlight-main">
              <CallRemoteTile
                peer={spotlightPeer}
                stream={remoteStreams[spotlightPeer.socketId]}
                pinned={pinnedId === spotlightPeer.socketId}
                canPin
                avatarSize={96}
                onTogglePin={() =>
                  props.onSetPinnedId(
                    pinnedId === spotlightPeer.socketId ? null : spotlightPeer.socketId,
                  )
                }
              />
            </div>
            <div className="call-spotlight-strip">
              {peers
                .filter((p) => p.socketId !== spotlightPeer.socketId)
                .map((peer) => (
                  <CallRemoteTile
                    key={peer.socketId}
                    peer={peer}
                    stream={remoteStreams[peer.socketId]}
                    pinned={pinnedId === peer.socketId}
                    canPin
                    avatarSize={48}
                    onTogglePin={() => props.onSetPinnedId(peer.socketId)}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div
            className={`call-grid peers-${Math.min(peers.length, 6)}`}
          >
            {peers.map((peer) => (
              <CallRemoteTile
                key={peer.socketId}
                peer={peer}
                stream={remoteStreams[peer.socketId]}
                pinned={pinnedId === peer.socketId}
                canPin={peers.length > 1}
                avatarSize={peers.length === 1 ? 92 : 64}
                onTogglePin={() =>
                  props.onSetPinnedId(
                    pinnedId === peer.socketId ? null : peer.socketId,
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Khung hình của chính mình ở góc dưới bên phải */}
        <div
          className={
            hasLocalVideo ? 'call-self-preview has-video' : 'call-self-preview'
          }
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={
              hasLocalVideo
                ? sharing
                  ? 'call-self-video is-sharing'
                  : 'call-self-video'
                : 'call-self-video is-hidden'
            }
          />
          {!hasLocalVideo ? (
            <div className="call-self-avatar">
              <UserAvatar
                size={36}
                src={user.avatarUrl}
                name={user.name}
                zoomable={false}
              />
              <span>Bạn {!micOn ? '(Tắt mic)' : ''}</span>
            </div>
          ) : (
            <span className="call-self-tag">
              Bạn {sharing ? '· Đang chia sẻ' : ''}
            </span>
          )}
        </div>
      </div>

      <footer className="call-window-controls">
        <Tooltip title={micOn ? 'Tắt micro' : 'Bật micro'}>
          <button
            type="button"
            className={micOn ? 'call-ctrl-btn' : 'call-ctrl-btn is-off'}
            aria-label={micOn ? 'Tắt micro' : 'Bật micro'}
            onClick={props.onToggleMic}
          >
            {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          </button>
        </Tooltip>

        <Tooltip title={camOn ? 'Tắt camera' : 'Bật camera'}>
          <button
            type="button"
            className={camOn ? 'call-ctrl-btn' : 'call-ctrl-btn is-off'}
            aria-label={camOn ? 'Tắt camera' : 'Bật camera'}
            onClick={props.onToggleCam}
          >
            {camOn ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
          </button>
        </Tooltip>

        <Tooltip title={sharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}>
          <button
            type="button"
            className={sharing ? 'call-ctrl-btn is-active' : 'call-ctrl-btn'}
            aria-label={sharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            onClick={props.onToggleShare}
          >
            <DesktopOutlined />
          </button>
        </Tooltip>

        <Popover
          open={deviceOpen}
          onOpenChange={setDeviceOpen}
          trigger="click"
          placement="top"
          content={
            <div className="meet-device-picker">
              <div className="meet-device-field">
                <label>Micro</label>
                <Select
                  size="small"
                  style={{ width: 220 }}
                  value={audioDeviceId || devices.mics[0]?.deviceId || undefined}
                  placeholder="Mặc định hệ thống"
                  onChange={props.onSelectAudioDevice}
                  options={devices.mics.map((m, idx) => ({
                    value: m.deviceId,
                    label: m.label || `Micro ${idx + 1}`,
                  }))}
                />
              </div>
              <div className="meet-device-field">
                <label>Camera</label>
                <Select
                  size="small"
                  style={{ width: 220 }}
                  value={videoDeviceId || devices.cams[0]?.deviceId || undefined}
                  placeholder="Mặc định hệ thống"
                  onChange={props.onSelectVideoDevice}
                  options={devices.cams.map((c, idx) => ({
                    value: c.deviceId,
                    label: c.label || `Camera ${idx + 1}`,
                  }))}
                />
              </div>
            </div>
          }
        >
          <Tooltip title="Thiết bị mic & camera">
            <button
              type="button"
              className="call-ctrl-btn"
              aria-label="Chọn thiết bị mic và camera"
            >
              <SettingOutlined />
            </button>
          </Tooltip>
        </Popover>

        <Tooltip title="Kết thúc cuộc gọi">
          <button
            type="button"
            className="call-ctrl-btn is-hangup"
            aria-label="Kết thúc cuộc gọi"
            onClick={props.onLeave}
          >
            <PhoneOutlined className="call-hangup-ico" />
          </button>
        </Tooltip>
      </footer>
    </div>
  );
}
