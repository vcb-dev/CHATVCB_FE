import { AudioMutedOutlined, AudioOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { fileSrc } from '@/api/client';
import { DevicePickerPopover } from './components/DevicePickerPopover';
import { openCamera } from './meet';
import { avatarColor, initials } from '@/lib/avatar';
import type { Meeting, User } from '@/types';

export type LobbyReady = {
  title: string;
  meeting?: Meeting;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
};

type Props = {
  user: User;
  meeting?: Meeting;
  onCancel: () => void;
  onReady: (next: LobbyReady) => Promise<void> | void;
};

export function MeetingLobby({ user, meeting, onCancel, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);
  const [title, setTitle] = useState(meeting?.title || `Họp ${user.team ?? 'team'}`);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined);
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (meeting?.title) {
      setTitle(meeting.title);
    }
  }, [meeting?.title]);

  useEffect(() => {
    let closed = false;
    void openCamera(true, { audioDeviceId, videoDeviceId })
      .then((stream) => {
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        const hasVideo = stream.getVideoTracks().length > 0;
        if (!hasVideo) {
          setCamOn(false);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      })
      .catch(() => {
        if (!closed) {
          setCamOn(false);
          message.warning('Chưa cấp camera/micro. Bạn vẫn vào họp được.');
          setReady(true);
        }
      });
    return () => {
      closed = true;
      if (!handedOffRef.current) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [audioDeviceId, videoDeviceId]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = camOn;
    });
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [micOn, camOn, ready]);

  function cancel() {
    handedOffRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onCancel();
  }

  async function join() {
    const name = title.trim();
    if (!name) {
      message.warning('Nhập tên cuộc họp.');
      return;
    }
    handedOffRef.current = true;
    setJoining(true);
    try {
      await onReady({
        title: name,
        meeting,
        stream: streamRef.current,
        micOn,
        camOn,
        audioDeviceId,
        videoDeviceId,
      });
    } catch {
      handedOffRef.current = false;
      setJoining(false);
    }
  }

  const hasVideoTrack = Boolean(
    streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live'),
  );
  const canEditTitle = !meeting || meeting.hostId === user.id;

  return (
    <div className="meet-lobby">
      <div className="meet-lobby-stage">
        <video
          ref={videoRef}
          className={camOn && ready && hasVideoTrack ? '' : 'is-hidden'}
          autoPlay
          muted
          playsInline
        />
        {camOn && ready && hasVideoTrack ? null : (
          <div className="meet-face">
            <span
              className="meet-blob"
              style={{
                background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(user.name)}`,
              }}
            >
              {user.avatarUrl ? (
                <Avatar size={220} src={fileSrc(user.avatarUrl)} />
              ) : (
                initials(user.name).slice(0, 1)
              )}
            </span>
          </div>
        )}
        <span className="meet-name">{user.name} (Tôi)</span>
        <div className="meet-lobby-ctrls">
          <button
            type="button"
            className={micOn ? 'meet-ctrl light' : 'meet-ctrl off'}
            onClick={() => setMicOn((v) => !v)}
          >
            {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          </button>
          <button
            type="button"
            className={camOn ? 'meet-ctrl light' : 'meet-ctrl off'}
            onClick={() => setCamOn((v) => !v)}
          >
            <VideoCameraOutlined />
          </button>
          <DevicePickerPopover
            audioDeviceId={audioDeviceId}
            videoDeviceId={videoDeviceId}
            onSelectAudio={setAudioDeviceId}
            onSelectVideo={setVideoDeviceId}
          />
        </div>
      </div>
      <aside className="meet-lobby-form">
        <h2>{meeting ? 'Sẵn sàng tham gia?' : 'Cuộc họp mới'}</h2>
        <p>
          {meeting
            ? `ID: ${meeting.code} · Chủ phòng: ${meeting.hostName}`
            : 'Đặt tên, kiểm tra mic và camera rồi vào họp.'}
        </p>
        <label>Tên cuộc họp</label>
        <Input
          size="large"
          value={title}
          disabled={!canEditTitle}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
        />
        <Button type="primary" size="large" block loading={joining} onClick={() => void join()}>
          {meeting ? 'Tham gia' : 'Bắt đầu họp'}
        </Button>
        <Button size="large" block onClick={cancel}>
          Hủy
        </Button>
      </aside>
    </div>
  );
}
