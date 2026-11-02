import {
  AudioMutedOutlined,
  AudioOutlined,
  CloseOutlined,
  CommentOutlined,
  CopyOutlined,
  DesktopOutlined,
  FileTextOutlined,
  PushpinOutlined,
  SmileOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Popover, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { closeSocket, connectSocket } from '@/api/socket';
import { avatarColor, initials } from '@/lib/avatar';
import type { Meeting, MeetingPeer, User } from '@/types';
import { DevicePickerPopover } from './components/DevicePickerPopover';
import {
  MeetingSidePanel,
  type ChatItem,
  type SideTab,
} from './components/MeetingSidePanel';
import { openCamera } from './meet';

type Signal = {
  type: 'offer' | 'answer' | 'ice';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
type FloatReact = { id: string; emoji: string; name: string };

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥'];

type Props = {
  meeting: Meeting;
  user: User;
  initialStream?: MediaStream | null;
  initialMic?: boolean;
  initialCam?: boolean;
  initialAudioDeviceId?: string;
  initialVideoDeviceId?: string;
  onLeave: () => void;
};

export function MeetingRoom({
  meeting,
  user,
  initialStream = null,
  initialMic = true,
  initialCam = true,
  initialAudioDeviceId,
  initialVideoDeviceId,
  onLeave,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const peerMapRef = useRef(new Map<string, MeetingPeer>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const onLeaveRef = useRef(onLeave);
  const startedRef = useRef(false);
  const joinedOnceRef = useRef(false);
  onLeaveRef.current = onLeave;

  const [ready, setReady] = useState(false);
  const [videoLive, setVideoLive] = useState(false);
  const [peers, setPeers] = useState<MeetingPeer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [micOn, setMicOn] = useState(initialMic);
  const [camOn, setCamOn] = useState(initialCam);
  const [sharing, setSharing] = useState(false);
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(
    initialAudioDeviceId,
  );
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(
    initialVideoDeviceId,
  );
  const [sideTab, setSideTab] = useState<SideTab | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState(meeting.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [hands, setHands] = useState<{ userId: string; name: string }[]>([]);
  const [reacts, setReacts] = useState<FloatReact[]>([]);
  const [elapsed, setElapsed] = useState('00:00');

  const mediaStateRef = useRef({ micOn, camOn, sharing });
  mediaStateRef.current = { micOn, camOn, sharing };

  useEffect(() => {
    const onHide = () => {
      api.closeMeetingOnExit(meeting.id, false);
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [meeting.id]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const start = meeting.startedAt
        ? new Date(meeting.startedAt).getTime()
        : Date.now();
      const sec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [meeting.startedAt]);

  useEffect(() => {
    if (!joinedOnceRef.current) {
      return;
    }
    socketRef.current?.emit('meeting.media', { micOn, camOn, sharing });
  }, [micOn, camOn, sharing]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    let closed = false;
    const socket = connectSocket();
    socketRef.current = socket;

    function emitJoin() {
      joinedOnceRef.current = true;
      socket.emit('meeting.join', {
        meetingId: meeting.id,
        micOn: mediaStateRef.current.micOn,
        camOn: mediaStateRef.current.camOn,
        sharing: mediaStateRef.current.sharing,
      });
    }

    function bindLocal(stream: MediaStream) {
      const hasAudio = stream.getAudioTracks().some((t) => t.readyState === 'live');
      const hasVideo = stream.getVideoTracks().some((t) => t.readyState === 'live');
      stream.getAudioTracks().forEach((track) => {
        track.enabled = initialMic && hasAudio;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = initialCam && hasVideo;
      });
      streamRef.current = stream;
      if (!hasAudio) {
        setMicOn(false);
        mediaStateRef.current.micOn = false;
      }
      if (!hasVideo) {
        setCamOn(false);
        mediaStateRef.current.camOn = false;
      }
      paintLocal(stream);
      setVideoLive(initialCam && hasVideo);
    }

    async function attachLocal() {
      const hasInitial =
        initialStream &&
        initialStream.getTracks().some((track) => track.readyState === 'live');
      const stream = hasInitial
        ? initialStream
        : await openCamera(true, {
            audioDeviceId: initialAudioDeviceId,
            videoDeviceId: initialVideoDeviceId,
          });
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

    function upsertPeer(peer: MeetingPeer) {
      peerMapRef.current.set(peer.socketId, peer);
      setPeers((current) => {
        const exists = current.some((item) => item.socketId === peer.socketId);
        if (exists) {
          return current.map((item) =>
            item.socketId === peer.socketId ? { ...item, ...peer } : item,
          );
        }
        return [...current, peer];
      });
    }

    async function ensurePc(peer: MeetingPeer) {
      const existing = pcsRef.current.get(peer.socketId);
      if (existing) {
        return existing;
      }
      upsertPeer(peer);
      const pc = new RTCPeerConnection(ICE);
      pcsRef.current.set(peer.socketId, pc);
      streamRef.current?.getTracks().forEach((track) => {
        if (streamRef.current) {
          pc.addTrack(track, streamRef.current);
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signal(peer.socketId, {
            type: 'ice',
            candidate: event.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (event) => {
        // Track thêm sau bằng replaceTrack không có stream đi kèm: gom theo peer để không mất tiếng
        setRemoteStreams((current) => {
          const kept =
            current[peer.socketId]
              ?.getTracks()
              .filter((track) => track.kind !== event.track.kind) ?? [];
          return {
            ...current,
            [peer.socketId]: new MediaStream([...kept, event.track]),
          };
        });
      };
      return pc;
    }

    // Bên gửi offer cần đủ 2 m-line để nhận hình/tiếng kể cả khi máy không có thiết bị
    function addRecvTransceivers(pc: RTCPeerConnection) {
      for (const kind of ['audio', 'video'] as const) {
        const covered = pc
          .getTransceivers()
          .some((t) => t.receiver.track.kind === kind);
        if (!covered) {
          pc.addTransceiver(kind, { direction: 'recvonly' });
        }
      }
    }

    // addIceCandidate chỉ dùng được sau khi có remote description
    async function flushIce(socketId: string, pc: RTCPeerConnection) {
      const queued = pendingIce.current.get(socketId) ?? [];
      pendingIce.current.delete(socketId);
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
      }
    }

    socket.on('connect', () => {
      if (joinedOnceRef.current && !closed) {
        emitJoin();
      }
    });

    socket.on('meeting.peers', (list: MeetingPeer[]) => {
      const normalized = list.map((p) => ({
        ...p,
        micOn: p.micOn ?? true,
        camOn: p.camOn ?? true,
        sharing: Boolean(p.sharing),
      }));
      peerMapRef.current.clear();
      for (const p of normalized) {
        peerMapRef.current.set(p.socketId, p);
      }
      setPeers(normalized);
      for (const peer of normalized) {
        void ensurePc(peer).then(async (pc) => {
          if (pc.signalingState !== 'stable' || pc.localDescription) {
            return;
          }
          addRecvTransceivers(pc);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal(peer.socketId, { type: 'offer', sdp: offer });
        });
      }
    });

    socket.on('meeting.peer-joined', (peer: MeetingPeer) => {
      upsertPeer({
        ...peer,
        micOn: peer.micOn ?? true,
        camOn: peer.camOn ?? true,
        sharing: Boolean(peer.sharing),
      });
    });

    socket.on(
      'meeting.peer-media',
      (patch: {
        socketId: string;
        userId: string;
        micOn: boolean;
        camOn: boolean;
        sharing: boolean;
      }) => {
        const prev = peerMapRef.current.get(patch.socketId);
        if (prev) {
          peerMapRef.current.set(patch.socketId, { ...prev, ...patch });
        }
        setPeers((current) =>
          current.map((item) =>
            item.socketId === patch.socketId
              ? {
                  ...item,
                  micOn: patch.micOn,
                  camOn: patch.camOn,
                  sharing: patch.sharing,
                }
              : item,
          ),
        );
      },
    );

    socket.on('meeting.peer-left', ({ socketId }: { socketId: string }) => {
      pcsRef.current.get(socketId)?.close();
      pcsRef.current.delete(socketId);
      peerMapRef.current.delete(socketId);
      setPeers((current) => current.filter((item) => item.socketId !== socketId));
      setRemoteStreams((current) => {
        const next = { ...current };
        delete next[socketId];
        return next;
      });
    });

    socket.on(
      'meeting.signal',
      async ({
        from,
        userId,
        name,
        payload,
      }: {
        from: string;
        userId?: string;
        name?: string;
        payload: Signal;
      }) => {
        const existingPeer = peerMapRef.current.get(from);
        const peerInfo: MeetingPeer = existingPeer ?? {
          socketId: from,
          userId: userId || '',
          name: name || 'Khách',
          micOn: true,
          camOn: true,
          sharing: false,
        };
        if (payload.type === 'offer' && payload.sdp) {
          const pc = await ensurePc(peerInfo);
          if (pc.signalingState !== 'stable') {
            await pc.setLocalDescription({ type: 'rollback' }).catch(() => undefined);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushIce(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signal(from, { type: 'answer', sdp: answer });
          return;
        }
        const pc = pcsRef.current.get(from);
        if (
          payload.type === 'answer' &&
          payload.sdp &&
          pc &&
          pc.signalingState === 'have-local-offer'
        ) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushIce(from, pc);
          return;
        }
        if (payload.type === 'ice' && payload.candidate) {
          if (!pc || !pc.remoteDescription) {
            const queue = pendingIce.current.get(from) ?? [];
            queue.push(payload.candidate);
            pendingIce.current.set(from, queue);
            return;
          }
          await pc
            .addIceCandidate(new RTCIceCandidate(payload.candidate))
            .catch(() => undefined);
        }
      },
    );

    socket.on('meeting.chat-history', (items: ChatItem[]) => setChat(items));
    socket.on('meeting.chat', (item: ChatItem) =>
      setChat((current) => [...current, item]),
    );
    socket.on('meeting.hands', (items: { userId: string; name: string }[]) =>
      setHands(items),
    );
    socket.on('meeting.react', (item: FloatReact & { userId: string }) => {
      setReacts((current) => [...current, item]);
      window.setTimeout(() => {
        setReacts((current) => current.filter((row) => row.id !== item.id));
      }, 2400);
    });
    socket.on(
      'meeting.notes',
      (payload: { meetingId: string; notes: string; updatedByName?: string }) => {
        if (payload.meetingId === meeting.id) {
          setNotes(payload.notes);
        }
      },
    );
    socket.on(
      'meeting.ended',
      (payload?: { meetingId?: string; byName?: string }) => {
        if (!payload?.meetingId || payload.meetingId === meeting.id) {
          message.info('Cuộc họp đã kết thúc.');
          onLeaveRef.current();
        }
      },
    );

    void attachLocal()
      .then(() => {
        if (closed) {
          return;
        }
        emitJoin();
      })
      .catch(() => {
        if (!closed) {
          setMicOn(false);
          setCamOn(false);
          mediaStateRef.current = { micOn: false, camOn: false, sharing: false };
          setReady(true);
          emitJoin();
        }
      });

    return () => {
      closed = true;
      startedRef.current = false;
      joinedOnceRef.current = false;
      socket.removeAllListeners();
      socket.emit('meeting.leave');
      closeSocket(socket);
      socketRef.current = null;
      for (const pc of pcsRef.current.values()) {
        pc.close();
      }
      pcsRef.current.clear();
      peerMapRef.current.clear();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [
    initialAudioDeviceId,
    initialCam,
    initialMic,
    initialStream,
    initialVideoDeviceId,
    meeting.id,
  ]);

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
  }, [ready, camOn, sharing, videoLive, pinnedId]);

  async function replaceVideo(track: MediaStreamTrack | null) {
    for (const [socketId, pc] of pcsRef.current.entries()) {
      const videoSender = pc.getSenders().find((item) => item.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(track);
        continue;
      }
      const transceiver = pc
        .getTransceivers()
        .find((t) => t.mid !== null && t.receiver.track.kind === 'video');
      if (transceiver && track) {
        await transceiver.sender.replaceTrack(track);
        transceiver.direction = 'sendrecv';
        if (pc.signalingState === 'stable' && socketRef.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('meeting.signal', {
            to: socketId,
            payload: { type: 'offer', sdp: offer },
          });
        }
      }
    }
  }

  async function replaceAudio(track: MediaStreamTrack | null) {
    for (const [socketId, pc] of pcsRef.current.entries()) {
      const audioSender = pc.getSenders().find((item) => item.track?.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(track);
        continue;
      }
      const transceiver = pc
        .getTransceivers()
        .find((t) => t.mid !== null && t.receiver.track.kind === 'audio');
      if (transceiver && track) {
        await transceiver.sender.replaceTrack(track);
        transceiver.direction = 'sendrecv';
        if (pc.signalingState === 'stable' && socketRef.current) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current.emit('meeting.signal', {
            to: socketId,
            payload: { type: 'offer', sdp: offer },
          });
        }
      }
    }
  }

  async function handleSelectAudioDevice(deviceId: string) {
    setAudioDeviceId(deviceId);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const nextTrack = nextStream.getAudioTracks()[0];
      if (!nextTrack) {
        return;
      }
      nextTrack.enabled = micOn;
      const current = streamRef.current ?? new MediaStream();
      current.getAudioTracks().forEach((track) => {
        current.removeTrack(track);
        track.stop();
      });
      current.addTrack(nextTrack);
      streamRef.current = current;
      await replaceAudio(nextTrack);
    } catch {
      message.error('Không đổi được thiết bị micro.');
    }
  }

  async function handleSelectVideoDevice(deviceId: string) {
    setVideoDeviceId(deviceId);
    if (sharing) {
      return;
    }
    try {
      const cam = await openCamera(false, { videoDeviceId: deviceId });
      const nextTrack = cam.getVideoTracks()[0];
      if (!nextTrack) {
        return;
      }
      nextTrack.enabled = camOn;
      const current = streamRef.current ?? new MediaStream();
      current.getVideoTracks().forEach((track) => {
        current.removeTrack(track);
        track.stop();
      });
      current.addTrack(nextTrack);
      streamRef.current = current;
      await replaceVideo(nextTrack);
      paintLocal(current);
      setVideoLive(camOn);
    } catch {
      message.error('Không đổi được thiết bị camera.');
    }
  }

  async function restoreCamera() {
    try {
      if (camOn) {
        const cam = await openCamera(false, { videoDeviceId });
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
        await replaceVideo(next ?? null);
        paintLocal(current);
        setSharing(false);
        setVideoLive(Boolean(next));
      } else {
        const current = streamRef.current ?? new MediaStream();
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        streamRef.current = current;
        await replaceVideo(null);
        setSharing(false);
        setVideoLive(false);
      }
    } catch {
      setSharing(false);
      setVideoLive(false);
    }
  }

  async function toggleMic() {
    const next = !micOn;
    const liveAudio = streamRef.current
      ?.getAudioTracks()
      .find((t) => t.readyState === 'live');
    if (next && !liveAudio) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: false,
        });
        const track = audioStream.getAudioTracks()[0];
        if (track) {
          const current = streamRef.current ?? new MediaStream();
          current.addTrack(track);
          streamRef.current = current;
          await replaceAudio(track);
        }
      } catch {
        message.error('Không bật được micro.');
        return;
      }
    }
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  async function toggleCam() {
    if (camOn) {
      streamRef.current?.getVideoTracks().forEach((track) => {
        if (!sharing) {
          track.enabled = false;
        }
      });
      setCamOn(false);
      if (!sharing) {
        setVideoLive(false);
      }
      return;
    }
    if (sharing) {
      setCamOn(true);
      return;
    }
    let track = streamRef.current
      ?.getVideoTracks()
      .find((item) => item.readyState === 'live');
    if (!track) {
      try {
        const cam = await openCamera(false, { videoDeviceId });
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
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
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
      paintLocal(current);
      await replaceVideo(next ?? null);
      setSharing(true);
      setVideoLive(true);
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

  async function saveRoomNotes() {
    setSavingNotes(true);
    try {
      await api.saveMeetingNotes(meeting.id, notes);
      message.success('Đã lưu biên bản.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được biên bản.');
    } finally {
      setSavingNotes(false);
    }
  }

  function react(emoji: string) {
    socketRef.current?.emit('meeting.react', { emoji });
  }

  const handUp = hands.some((item) => item.userId === user.id);
  function toggleHand() {
    socketRef.current?.emit('meeting.hand', { raised: !handUp });
  }

  async function leaveOnly() {
    setLeaveMenuOpen(false);
    try {
      await api.leaveMeeting(meeting.id);
    } catch {
      // keep leaving
    }
    onLeaveRef.current();
  }

  async function endForAll() {
    setLeaveMenuOpen(false);
    try {
      await api.endMeeting(meeting.id);
    } catch {
      // keep leaving
    }
    onLeaveRef.current();
  }

  function toggleTab(target: SideTab) {
    setSideTab((prev) => (prev === target ? null : target));
  }

  const tiles = peers.length + 1;
  const gridCount = tiles <= 4 ? tiles : tiles <= 6 ? 6 : tiles <= 9 ? 9 : 16;
  const showLocalVideo =
    (camOn || sharing) &&
    (videoLive ||
      Boolean(
        streamRef.current
          ?.getVideoTracks()
          .some((track) => track.readyState === 'live' && track.enabled),
      ));

  const validPinned =
    pinnedId === 'local' ||
    (pinnedId && peers.some((p) => p.socketId === pinnedId))
      ? pinnedId
      : null;
  const sharingPeer = peers.find((p) => p.sharing);
  const activeSpotlightId =
    validPinned ??
    (sharingPeer ? sharingPeer.socketId : sharing && peers.length > 0 ? 'local' : null);

  function renderLocalTile() {
    const isPinned = activeSpotlightId === 'local';
    return (
      <div
        key="local"
        className={`meet-tile${isPinned ? ' is-pinned' : ''}`}
        onClick={() => setPinnedId((prev) => (prev === 'local' ? null : 'local'))}
      >
        <video
          ref={(node) => {
            localRef.current = node;
            if (node) {
              paintLocal();
            }
          }}
          className={
            showLocalVideo
              ? sharing
                ? 'meet-local-video is-sharing'
                : 'meet-local-video'
              : 'meet-local-video is-hidden'
          }
          autoPlay
          muted
          playsInline
        />
        {showLocalVideo ? null : (
          <div className="meet-face">
            <span
              className="meet-blob"
              style={{
                background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(user.name)}`,
              }}
            >
              {user.avatarUrl ? (
                <Avatar size={180} src={fileSrc(user.avatarUrl)} />
              ) : (
                initials(user.name).slice(0, 1)
              )}
            </span>
          </div>
        )}
        <span className="meet-name">
          {handUp ? '✋ ' : ''}
          {user.name} (Tôi)
          {sharing ? ' · Đang chia sẻ' : ''}
          {micOn ? '' : ' · Mic tắt'}
        </span>
        <span className="meet-pin-badge" title="Ghim toàn màn hình">
          <PushpinOutlined />
        </span>
      </div>
    );
  }

  function renderRemoteTile(peer: MeetingPeer) {
    const isPinned = activeSpotlightId === peer.socketId;
    return (
      <RemoteTile
        key={peer.socketId}
        peer={peer}
        stream={remoteStreams[peer.socketId]}
        hand={hands.some((row) => row.userId === peer.userId)}
        pinned={isPinned}
        onTogglePin={() =>
          setPinnedId((prev) => (prev === peer.socketId ? null : peer.socketId))
        }
      />
    );
  }

  const isHost = user.id === meeting.hostId;

  return (
    <div className="meet-room gmeet">
      <header className="meet-room-head">
        <div>
          <strong>{meeting.title}</strong>
          <small>
            {elapsed} · ID {meeting.code} · {tiles} người
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
        {activeSpotlightId && tiles > 1 ? (
          <div className="meet-spotlight">
            <div className="meet-spotlight-main">
              {activeSpotlightId === 'local'
                ? renderLocalTile()
                : (() => {
                    const target = peers.find(
                      (p) => p.socketId === activeSpotlightId,
                    );
                    return target ? renderRemoteTile(target) : renderLocalTile();
                  })()}
            </div>
            <div className="meet-spotlight-strip">
              {activeSpotlightId !== 'local' ? renderLocalTile() : null}
              {peers
                .filter((p) => p.socketId !== activeSpotlightId)
                .map((p) => renderRemoteTile(p))}
            </div>
          </div>
        ) : (
          <div className={`meet-grid count-${gridCount}`}>
            {renderLocalTile()}
            {peers.map((peer) => renderRemoteTile(peer))}
          </div>
        )}

        {sideTab ? (
          <MeetingSidePanel
            tab={sideTab}
            meeting={meeting}
            user={user}
            micOn={micOn}
            camOn={camOn}
            sharing={sharing}
            peers={peers}
            hands={hands}
            chat={chat}
            draft={draft}
            notes={notes}
            savingNotes={savingNotes}
            onTabChange={setSideTab}
            onDraftChange={setDraft}
            onSendChat={sendChat}
            onNotesChange={setNotes}
            onSaveNotes={() => void saveRoomNotes()}
            onClose={() => setSideTab(null)}
          />
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
          <button type="button" className="meet-ctrl light" aria-label="Biểu cảm">
            <SmileOutlined />
          </button>
        </Popover>
        <Tooltip title="Tin nhắn">
          <button
            type="button"
            className={sideTab === 'chat' ? 'meet-ctrl on' : 'meet-ctrl light'}
            onClick={() => toggleTab('chat')}
          >
            <CommentOutlined />
          </button>
        </Tooltip>
        <Tooltip title={`Người tham gia (${tiles})`}>
          <button
            type="button"
            className={sideTab === 'peers' ? 'meet-ctrl on' : 'meet-ctrl light'}
            onClick={() => toggleTab('peers')}
          >
            <TeamOutlined />
          </button>
        </Tooltip>
        <Tooltip title="Biên bản cuộc họp">
          <button
            type="button"
            className={sideTab === 'notes' ? 'meet-ctrl on' : 'meet-ctrl light'}
            onClick={() => toggleTab('notes')}
          >
            <FileTextOutlined />
          </button>
        </Tooltip>
        <Tooltip title={micOn ? 'Tắt mic' : 'Bật mic'}>
          <button
            type="button"
            className={micOn ? 'meet-ctrl light' : 'meet-ctrl off'}
            onClick={() => void toggleMic()}
          >
            {micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
          </button>
        </Tooltip>
        <Tooltip title={camOn ? 'Tắt camera' : 'Bật camera'}>
          <button
            type="button"
            className={camOn ? 'meet-ctrl light' : 'meet-ctrl off'}
            onClick={() => void toggleCam()}
          >
            <VideoCameraOutlined />
          </button>
        </Tooltip>
        <DevicePickerPopover
          audioDeviceId={audioDeviceId}
          videoDeviceId={videoDeviceId}
          onSelectAudio={(id) => void handleSelectAudioDevice(id)}
          onSelectVideo={(id) => void handleSelectVideoDevice(id)}
        />
        <Tooltip title={sharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}>
          <button
            type="button"
            className={sharing ? 'meet-ctrl on' : 'meet-ctrl light'}
            onClick={() => void toggleShare()}
          >
            <DesktopOutlined />
          </button>
        </Tooltip>
        <Tooltip title={handUp ? 'Hạ tay' : 'Giơ tay'}>
          <button
            type="button"
            className={handUp ? 'meet-ctrl on' : 'meet-ctrl light'}
            onClick={toggleHand}
          >
            ✋
          </button>
        </Tooltip>
        {isHost ? (
          <Popover
            open={leaveMenuOpen}
            onOpenChange={setLeaveMenuOpen}
            trigger="click"
            placement="topRight"
            content={
              <div className="meet-leave-menu">
                <Button block onClick={() => void leaveOnly()}>
                  Rời cuộc họp
                </Button>
                <Button danger type="primary" block onClick={() => void endForAll()}>
                  Kết thúc cho tất cả
                </Button>
              </div>
            }
          >
            <Tooltip title="Rời hoặc kết thúc cuộc họp">
              <button
                type="button"
                className="meet-ctrl leave"
                aria-label="Rời hoặc kết thúc cuộc họp"
              >
                <CloseOutlined />
              </button>
            </Tooltip>
          </Popover>
        ) : (
          <Tooltip title="Rời cuộc họp">
            <button
              type="button"
              className="meet-ctrl leave"
              aria-label="Rời cuộc họp"
              onClick={() => void leaveOnly()}
            >
              <CloseOutlined />
            </button>
          </Tooltip>
        )}
      </footer>
    </div>
  );
}

function RemoteTile({
  peer,
  stream,
  hand,
  pinned,
  onTogglePin,
}: {
  peer: MeetingPeer;
  stream?: MediaStream;
  hand: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasStreamVideo = Boolean(
    stream
      ?.getVideoTracks()
      .some((track) => track.enabled && track.readyState === 'live'),
  );
  const showVideo = (peer.camOn || peer.sharing) && hasStreamVideo;

  useEffect(() => {
    if (ref.current && stream) {
      if (ref.current.srcObject !== stream) {
        ref.current.srcObject = stream;
      }
      void ref.current.play().catch(() => undefined);
    }
  }, [stream, showVideo, pinned]);

  return (
    <div
      className={`meet-tile${pinned ? ' is-pinned' : ''}`}
      onClick={onTogglePin}
    >
      <video
        ref={ref}
        className={showVideo ? (peer.sharing ? 'is-sharing' : '') : 'is-hidden'}
        autoPlay
        playsInline
      />
      {showVideo ? null : (
        <div className="meet-face">
          <span
            className="meet-blob"
            style={{
              background: `radial-gradient(circle at 30% 25%, #fff6, transparent 42%), ${avatarColor(peer.name)}`,
            }}
          >
            {peer.avatarUrl ? (
              <Avatar size={180} src={fileSrc(peer.avatarUrl)} />
            ) : (
              initials(peer.name).slice(0, 1)
            )}
          </span>
        </div>
      )}
      <span className="meet-name">
        {hand ? '✋ ' : ''}
        {peer.name}
        {peer.sharing ? ' · Đang chia sẻ' : ''}
        {peer.micOn ? '' : ' · Mic tắt'}
      </span>
      <span className="meet-pin-badge" title="Ghim toàn màn hình">
        <PushpinOutlined />
      </span>
    </div>
  );
}
