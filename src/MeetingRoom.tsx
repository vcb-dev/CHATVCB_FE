import {
  AudioMutedOutlined,
  AudioOutlined,
  CloseOutlined,
  CommentOutlined,
  CopyOutlined,
  DesktopOutlined,
  SmileOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input, Popover, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from './api';
import { openCamera } from './meet';
import { connectSocket } from './socket';
import { avatarColor, initials } from './theme';
import type { Meeting, User } from './types';

type PeerInfo = { socketId: string; userId: string; name: string };
type Signal = { type: 'offer' | 'answer' | 'ice'; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type Remote = { socketId: string; name: string; stream: MediaStream };
type ChatItem = { id: string; userId: string; name: string; text: string; at: number };
type FloatReact = { id: string; emoji: string; name: string };

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥'];

type Props = {
  meeting: Meeting;
  user: User;
  initialStream?: MediaStream | null;
  initialMic?: boolean;
  initialCam?: boolean;
  onLeave: () => void;
};

export function MeetingRoom({
  meeting,
  user,
  initialStream = null,
  initialMic = true,
  initialCam = true,
  onLeave,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const namesRef = useRef(new Map<string, string>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const onLeaveRef = useRef(onLeave);
  const startedRef = useRef(false);
  onLeaveRef.current = onLeave;

  const [ready, setReady] = useState(false);
  const [videoLive, setVideoLive] = useState(false);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [micOn, setMicOn] = useState(initialMic);
  const [camOn, setCamOn] = useState(initialCam);
  const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState('');
  const [hands, setHands] = useState<{ userId: string; name: string }[]>([]);
  const [reacts, setReacts] = useState<FloatReact[]>([]);
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const onHide = () => {
      api.closeMeetingOnExit(meeting.id, user.id === meeting.hostId);
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [meeting.hostId, meeting.id, user.id]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const start = meeting.startedAt ? new Date(meeting.startedAt).getTime() : Date.now();
      const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [meeting.startedAt]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, chatOpen]);

  useEffect(() => {
    const token = localStorage.getItem('chatvcb.token');
    if (!token || startedRef.current) {
      return;
    }
    startedRef.current = true;
    let closed = false;
    const socket = connectSocket(token);
    socketRef.current = socket;

    function bindLocal(stream: MediaStream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = initialMic;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = initialCam;
      });
      streamRef.current = stream;
      paintLocal(stream);
      setVideoLive(initialCam && stream.getVideoTracks().some((track) => track.readyState === 'live'));
    }

    async function attachLocal() {
      const stream = await openCamera(true);
      if (closed) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      bindLocal(stream);
      setReady(true);
      return stream;
    }

    function signal(to: string, payload: Signal) {
      socket.emit('meeting.signal', { to, payload });
    }

    async function ensurePc(peer: PeerInfo) {
      const existing = pcsRef.current.get(peer.socketId);
      if (existing) {
        return existing;
      }
      namesRef.current.set(peer.socketId, peer.name);
      const pc = new RTCPeerConnection(ICE);
      pcsRef.current.set(peer.socketId, pc);
      streamRef.current?.getTracks().forEach((track) => {
        if (streamRef.current) {
          pc.addTrack(track, streamRef.current);
        }
      });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signal(peer.socketId, { type: 'ice', candidate: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event) => {
        const media = event.streams[0];
        if (!media) {
          return;
        }
        setRemotes((current) => {
          if (current.some((item) => item.socketId === peer.socketId && item.stream.id === media.id)) {
            return current;
          }
          return [
            ...current.filter((item) => item.socketId !== peer.socketId),
            { socketId: peer.socketId, name: namesRef.current.get(peer.socketId) || peer.name, stream: media },
          ];
        });
      };
      for (const candidate of pendingIce.current.get(peer.socketId) ?? []) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIce.current.delete(peer.socketId);
      return pc;
    }

    socket.on('meeting.peers', (peers: PeerInfo[]) => {
      for (const peer of peers) {
        void ensurePc(peer).then(async (pc) => {
          if (pc.signalingState !== 'stable' || pc.localDescription) {
            return;
          }
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal(peer.socketId, { type: 'offer', sdp: offer });
        });
      }
    });
    socket.on('meeting.peer-joined', (peer: PeerInfo) => {
      namesRef.current.set(peer.socketId, peer.name);
    });
    socket.on('meeting.peer-left', ({ socketId }: { socketId: string }) => {
      pcsRef.current.get(socketId)?.close();
      pcsRef.current.delete(socketId);
      setRemotes((current) => current.filter((item) => item.socketId !== socketId));
    });
    socket.on('meeting.signal', async ({ from, name, payload }: { from: string; name?: string; payload: Signal }) => {
      if (name) {
        namesRef.current.set(from, name);
      }
      if (payload.type === 'offer' && payload.sdp) {
        const pc = await ensurePc({ socketId: from, userId: '', name: name || 'Khách' });
        if (pc.signalingState !== 'stable') {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal(from, { type: 'answer', sdp: answer });
        return;
      }
      const pc = pcsRef.current.get(from);
      if (payload.type === 'answer' && payload.sdp && pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        return;
      }
      if (payload.type === 'ice' && payload.candidate) {
        if (!pc) {
          const queue = pendingIce.current.get(from) ?? [];
          queue.push(payload.candidate);
          pendingIce.current.set(from, queue);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });
    socket.on('meeting.chat-history', (items: ChatItem[]) => setChat(items));
    socket.on('meeting.chat', (item: ChatItem) => setChat((current) => [...current, item]));
    socket.on('meeting.hands', (items: { userId: string; name: string }[]) => setHands(items));
    socket.on('meeting.react', (item: FloatReact & { userId: string }) => {
      setReacts((current) => [...current, item]);
      window.setTimeout(() => {
        setReacts((current) => current.filter((row) => row.id !== item.id));
      }, 2400);
    });

    void attachLocal()
      .then((stream) => {
        if (!stream || closed) {
          return;
        }
        socket.emit('meeting.join', meeting.id);
      })
      .catch(() => {
        if (!closed) {
          message.error('Không bật được camera/micro.');
          setReady(true);
          socket.emit('meeting.join', meeting.id);
        }
      });

    return () => {
      closed = true;
      startedRef.current = false;
      socket.removeAllListeners();
      socket.emit('meeting.leave');
      socket.disconnect();
      socketRef.current = null;
      for (const pc of pcsRef.current.values()) {
        pc.close();
      }
      pcsRef.current.clear();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [initialCam, initialMic, meeting.id]);

  function paintLocal(stream = streamRef.current) {
    const video = localRef.current;
    if (!video || !stream) {
      return;
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => undefined);
  }

  useEffect(() => {
    paintLocal();
  }, [ready, camOn, videoLive]);

  async function replaceVideo(track: MediaStreamTrack | null) {
    for (const pc of pcsRef.current.values()) {
      const videoSender = pc.getSenders().find((item) => item.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(track);
      }
    }
  }

  async function restoreCamera() {
    try {
      const cam = await openCamera(false);
      const next = cam.getVideoTracks()[0];
      const current = streamRef.current ?? new MediaStream();
      current.getVideoTracks().forEach((track) => {
        current.removeTrack(track);
        track.stop();
      });
      if (next) {
        next.enabled = camOn;
        current.addTrack(next);
      }
      streamRef.current = current;
      if (localRef.current) {
        localRef.current.srcObject = current;
        void localRef.current.play().catch(() => undefined);
      }
      await replaceVideo(next ?? null);
      paintLocal();
      setSharing(false);
      setVideoLive(camOn);
    } catch {
      setSharing(false);
    }
  }

  function toggleMic() {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  async function toggleCam() {
    if (camOn) {
      streamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      setCamOn(false);
      setVideoLive(false);
      return;
    }
    let track = streamRef.current?.getVideoTracks().find((item) => item.readyState === 'live');
    if (!track) {
      try {
        const cam = await openCamera(false);
        track = cam.getVideoTracks()[0];
        const current = streamRef.current ?? new MediaStream();
        current.getVideoTracks().forEach((item) => {
          current.removeTrack(item);
          item.stop();
        });
        if (track) {
          current.addTrack(track);
        }
        streamRef.current = current;
        await replaceVideo(track ?? null);
      } catch {
        message.error('Không bật được camera.');
        return;
      }
    } else {
      track.enabled = true;
    }
    paintLocal();
    setCamOn(true);
    setVideoLive(true);
  }

  async function toggleShare() {
    if (sharing) {
      await restoreCamera();
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const next = screen.getVideoTracks()[0];
      const current = streamRef.current ?? new MediaStream();
      current.getVideoTracks().forEach((track) => {
        current.removeTrack(track);
        track.stop();
      });
      if (next) {
        current.addTrack(next);
        next.addEventListener('ended', () => {
          void restoreCamera();
        });
      }
      streamRef.current = current;
      if (localRef.current) {
        localRef.current.srcObject = current;
        void localRef.current.play().catch(() => undefined);
      }
      await replaceVideo(next ?? null);
      setSharing(true);
    } catch {
      message.info('Đã hủy chia sẻ màn hình.');
    }
  }

  function sendChat() {
    const text = draft.trim();
    if (!text) {
      return;
    }
    socketRef.current?.emit('meeting.chat', { text });
    setDraft('');
  }

  function react(emoji: string) {
    socketRef.current?.emit('meeting.react', { emoji });
  }

  const handUp = hands.some((item) => item.userId === user.id);
  function toggleHand() {
    socketRef.current?.emit('meeting.hand', { raised: !handUp });
  }

  async function leave() {
    try {
      if (user.id === meeting.hostId) {
        await api.endMeeting(meeting.id);
      } else {
        await api.leaveMeeting(meeting.id);
      }
    } catch {
      // keep leaving
    }
    onLeaveRef.current();
  }

  const tiles = remotes.length + 1;
  const showLocalVideo = (camOn || sharing) && (videoLive || Boolean(streamRef.current?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled)));

  return (
    <div className="meet-room gmeet">
      <header className="meet-room-head">
        <div>
          <strong>{meeting.title}</strong>
          <small>
            {elapsed} · ID {meeting.code}
          </small>
        </div>
        <Button
          icon={<CopyOutlined />}
          onClick={() => {
            void navigator.clipboard.writeText(meeting.code);
            message.success('Đã copy mã họp.');
          }}
        >
          Copy mã
        </Button>
      </header>
      <div className="meet-stage">
        <div className={`meet-grid count-${Math.min(tiles, 4)}`}>
          <div className="meet-tile">
            <video
              ref={(node) => {
                localRef.current = node;
                if (node) {
                  paintLocal();
                }
              }}
              className={showLocalVideo ? 'meet-local-video' : 'meet-local-video is-hidden'}
              autoPlay
              muted
              playsInline
            />
            {showLocalVideo ? null : (
              <div className="meet-face">
                <span className="meet-blob" style={{ background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(user.name)}` }}>
                  {user.avatarUrl ? <Avatar size={180} src={fileSrc(user.avatarUrl)} /> : initials(user.name).slice(0, 1)}
                </span>
              </div>
            )}
            <span className="meet-name">
              {handUp ? '✋ ' : ''}
              {user.name} (Tôi)
              {micOn ? '' : ' · Mic tắt'}
            </span>
          </div>
          {remotes.map((item) => (
            <RemoteTile
              key={item.socketId}
              name={item.name}
              stream={item.stream}
              hand={hands.some((row) => row.name === item.name)}
            />
          ))}
        </div>
        {chatOpen ? (
          <aside className="meet-chat">
            <header>
              <strong>Tin nhắn</strong>
              <button type="button" onClick={() => setChatOpen(false)}>
                Đóng
              </button>
            </header>
            <div className="meet-chat-list">
              {chat.map((item) => (
                <p key={item.id}>
                  <b>{item.name}</b>
                  {item.text}
                </p>
              ))}
              <div ref={chatEnd} />
            </div>
            <div className="meet-chat-form">
              <Input
                value={draft}
                placeholder="Nhắn cho mọi người"
                onChange={(event) => setDraft(event.target.value)}
                onPressEnter={sendChat}
              />
              <Button type="primary" onClick={sendChat}>
                Gửi
              </Button>
            </div>
          </aside>
        ) : null}
      </div>
      <div className="meet-floats">
        {reacts.map((item) => (
          <span key={item.id} className="meet-float">
            {item.emoji}
            <small>{item.name}</small>
          </span>
        ))}
      </div>
      {hands.length ? (
        <div className="meet-hands">
          {hands.map((item) => (
            <span key={item.userId}>✋ {item.name}</span>
          ))}
        </div>
      ) : null}
      <footer className="meet-room-bar gmeet">
        <Popover
          trigger="click"
          content={
            <div className="meet-reacts">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => react(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          }
        >
          <button type="button" className="meet-ctrl light">
            <SmileOutlined />
          </button>
        </Popover>
        <Tooltip title="Chat">
          <button type="button" className={chatOpen ? 'meet-ctrl on' : 'meet-ctrl light'} onClick={() => setChatOpen((v) => !v)}>
            <CommentOutlined />
          </button>
        </Tooltip>
        <Tooltip title={micOn ? 'Tắt mic' : 'Bật mic'}>
          <button type="button" className={micOn ? 'meet-ctrl light' : 'meet-ctrl off'} onClick={toggleMic}>
            {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          </button>
        </Tooltip>
        <Tooltip title={camOn ? 'Tắt camera' : 'Bật camera'}>
          <button type="button" className={camOn ? 'meet-ctrl light' : 'meet-ctrl off'} onClick={toggleCam}>
            <VideoCameraOutlined />
          </button>
        </Tooltip>
        <Tooltip title={sharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}>
          <button type="button" className={sharing ? 'meet-ctrl on' : 'meet-ctrl light'} onClick={() => void toggleShare()}>
            <DesktopOutlined />
          </button>
        </Tooltip>
        <Tooltip title={handUp ? 'Hạ tay' : 'Giơ tay'}>
          <button type="button" className={handUp ? 'meet-ctrl on' : 'meet-ctrl light'} onClick={toggleHand}>
            ✋
          </button>
        </Tooltip>
        <Tooltip title="Rời cuộc họp">
          <button type="button" className="meet-ctrl leave" onClick={() => void leave()}>
            <CloseOutlined />
          </button>
        </Tooltip>
      </footer>
    </div>
  );
}

function RemoteTile({ name, stream, hand }: { name: string; stream: MediaStream; hand: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = stream.getVideoTracks().some((track) => track.enabled && track.readyState === 'live');
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <div className="meet-tile">
      <video ref={ref} className={hasVideo ? '' : 'is-hidden'} autoPlay playsInline />
      {hasVideo ? null : (
        <div className="meet-face">
          <span className="meet-blob" style={{ background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(name)}` }}>
            {initials(name).slice(0, 1)}
          </span>
        </div>
      )}
      <span className="meet-name">
        {hand ? '✋ ' : ''}
        {name}
      </span>
    </div>
  );
}
