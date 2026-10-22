import { AudioMutedOutlined, AudioOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Avatar, Button, Input, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { fileSrc } from '@/api/client';
import { openCamera } from './meet';
import { avatarColor, initials } from '@/theme';
import type { Meeting, User } from '@/types';

export type LobbyReady = {
  title: string;
  meeting?: Meeting;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
};

type Props = {
  user: User;
  meeting?: Meeting;
  onCancel: () => void;
  onReady: (next: LobbyReady) => void;
};

export function MeetingLobby({ user, meeting, onCancel, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [title, setTitle] = useState(meeting?.title || `Họp ${user.team ?? 'team'}`);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let closed = false;
    void openCamera(true)
      .then((stream) => {
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      })
      .catch(() => {
        if (!closed) {
          message.warning('Chưa cấp camera/micro. Bạn vẫn vào họp được.');
          setReady(true);
        }
      });
    return () => {
      closed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onCancel();
  }

  function join() {
    const name = title.trim();
    if (!name) {
      message.warning('Nhập tên cuộc họp.');
      return;
    }
    onReady({
      title: name,
      meeting,
      stream: streamRef.current,
      micOn,
      camOn,
    });
  }

  return (
    <div className="meet-lobby">
      <div className="meet-lobby-stage">
        <video ref={videoRef} className={camOn && ready ? '' : 'is-hidden'} autoPlay muted playsInline />
        {camOn && ready ? null : (
          <div className="meet-face">
            <span className="meet-blob" style={{ background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(user.name)}` }}>
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
          <button type="button" className={micOn ? 'meet-ctrl light' : 'meet-ctrl off'} onClick={() => setMicOn((v) => !v)}>
            {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          </button>
          <button type="button" className={camOn ? 'meet-ctrl light' : 'meet-ctrl off'} onClick={() => setCamOn((v) => !v)}>
            <VideoCameraOutlined />
          </button>
        </div>
      </div>
      <aside className="meet-lobby-form">
        <h2>{meeting ? 'Sẵn sàng tham gia?' : 'Cuộc họp mới'}</h2>
        <p>{meeting ? `ID: ${meeting.code}` : 'Đặt tên, kiểm tra mic và camera rồi vào họp.'}</p>
        <label>Tên cuộc họp</label>
        <Input size="large" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
        <Button type="primary" size="large" block onClick={join}>
          {meeting ? 'Tham gia' : 'Bắt đầu họp'}
        </Button>
        <Button size="large" block onClick={cancel}>
          Hủy
        </Button>
      </aside>
    </div>
  );
}
