import { message as antMessage } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { openCamera } from '@/features/meetings/meet';
import { setInCall } from '@/lib/inAppPage';
import { notifyIncoming } from '@/lib/notify';
import type {
  CallIncomingEvent,
  CallKind,
  CallMode,
  CallPeer,
  CallSignalPayload,
  Room,
  User,
} from '@/types';
import {
  formatCallClock,
  onCallCardAction,
  type CallSocketEvent,
} from '../utils/callEvents';
import {
  playEndTone,
  startIncomingTone,
  startOutgoingTone,
  stopCallTone,
} from '../utils/callSound';
import { isDirectRoom } from '../utils/rooms';

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export type ActiveCallState = {
  callId: string;
  roomId: string;
  roomTitle: string;
  roomAvatarUrl: string;
  kind: CallKind;
  mode: CallMode;
  callerId: string;
  connectedAt: number | null;
};

type Options = {
  user: User;
  rooms: Room[];
  openRoom: (roomId: string) => void;
  emitCall: (event: string, payload?: unknown) => void;
  setCallHandler: (fn: ((event: CallSocketEvent) => void) | null) => void;
};

export function useChatCall(options: Options) {
  const [incomingCall, setIncomingCall] = useState<CallIncomingEvent | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined);
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(undefined);
  const [elapsed, setElapsed] = useState('00:00');

  const latestRef = useRef(options);
  latestRef.current = options;

  const incomingRef = useRef<CallIncomingEvent | null>(null);
  incomingRef.current = incomingCall;

  const activeRef = useRef<ActiveCallState | null>(null);
  activeRef.current = activeCall;

  // Mở cuộc họp/bảng tính ngay trong app đã cài (điện thoại) sẽ gỡ ChatPage và cúp máy: inAppPage hỏi trước
  const inCall = Boolean(activeCall);
  useEffect(() => {
    setInCall(inCall);
    return () => setInCall(false);
  }, [inCall]);

  const streamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const peerMapRef = useRef(new Map<string, CallPeer>());
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const mediaStateRef = useRef({ micOn: true, camOn: false, sharing: false });
  mediaStateRef.current = { micOn, camOn, sharing };

  const cleanupCallResources = useCallback(() => {
    stopCallTone();
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    peerMapRef.current.clear();
    pendingIceRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    setPeers([]);
    setRemoteStreams({});
    setActiveCall(null);
    setSharing(false);
    setMinimized(false);
    setPinnedId(null);
    setElapsed('00:00');
  }, []);

  const acquireLocalMedia = useCallback(
    async (wantVideo: boolean): Promise<{ stream: MediaStream; hasMic: boolean; hasCam: boolean }> => {
      try {
        if (wantVideo) {
          const stream = await openCamera(true, {
            audioDeviceId,
            videoDeviceId,
          });
          const hasMic = stream.getAudioTracks().some((t) => t.readyState === 'live');
          const hasCam = stream.getVideoTracks().some((t) => t.readyState === 'live');
          return { stream, hasMic, hasCam };
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
          },
          video: false,
        });
        const hasMic = stream.getAudioTracks().some((t) => t.readyState === 'live');
        return { stream, hasMic, hasCam: false };
      } catch {
        // Máy không có mic/cam hoặc bị từ chối quyền: vẫn vào cuộc gọi ở chế độ nghe/xem
        return { stream: new MediaStream(), hasMic: false, hasCam: false };
      }
    },
    [audioDeviceId, videoDeviceId],
  );

  const upsertPeer = useCallback((peer: CallPeer) => {
    peerMapRef.current.set(peer.socketId, peer);
    setPeers((current) => {
      const exists = current.some((p) => p.socketId === peer.socketId);
      if (exists) {
        return current.map((p) => (p.socketId === peer.socketId ? { ...p, ...peer } : p));
      }
      return [...current, peer];
    });
  }, []);

  const addRecvTransceivers = useCallback((pc: RTCPeerConnection) => {
    for (const kind of ['audio', 'video'] as const) {
      const covered = pc.getTransceivers().some((t) => t.receiver.track.kind === kind);
      if (!covered) {
        pc.addTransceiver(kind, { direction: 'recvonly' });
      }
    }
  }, []);

  const flushIce = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.get(socketId) ?? [];
    pendingIceRef.current.delete(socketId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
    }
  }, []);

  const ensurePc = useCallback(
    async (peer: CallPeer): Promise<RTCPeerConnection> => {
      const existing = pcsRef.current.get(peer.socketId);
      if (existing) {
        return existing;
      }
      upsertPeer(peer);
      const pc = new RTCPeerConnection(ICE);
      pcsRef.current.set(peer.socketId, pc);
      const local = streamRef.current;
      if (local) {
        local.getTracks().forEach((track) => {
          pc.addTrack(track, local);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          latestRef.current.emitCall('call.signal', {
            to: peer.socketId,
            payload: {
              type: 'ice',
              candidate: event.candidate.toJSON(),
            } satisfies CallSignalPayload,
          });
        }
      };

      pc.ontrack = (event) => {
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
    },
    [upsertPeer],
  );

  // Đồng hồ đếm thời lượng cuộc gọi khi đã kết nối
  useEffect(() => {
    if (!activeCall?.connectedAt) {
      setElapsed('00:00');
      return;
    }
    const startMs = activeCall.connectedAt;
    const updateClock = () => {
      const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsed(formatCallClock(sec));
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [activeCall?.connectedAt]);

  // Phát tín hiệu khi trạng thái mic/cam/chia sẻ màn hình thay đổi
  useEffect(() => {
    if (!activeCall || activeCall.callId.startsWith('pending-')) {
      return;
    }
    latestRef.current.emitCall('call.media', { micOn, camOn, sharing });
  }, [activeCall, micOn, camOn, sharing]);

  // Lắng nghe sự kiện socket call.* từ useChatSocket
  useEffect(() => {
    const handleEvent = (event: CallSocketEvent) => {
      switch (event.type) {
        case 'incoming': {
          const data = event.data;
          // Nếu mình chính là người vừa gọi (tab khác của mình) thì không đổ chuông
          if (data.callerId === latestRef.current.user.id) {
            return;
          }
          // Đang trong một cuộc gọi khác: tự báo bận cho cuộc gọi 1-1 mới đến
          if (activeRef.current && activeRef.current.callId !== data.callId) {
            if (data.kind === 'direct') {
              latestRef.current.emitCall('call.reject', {
                callId: data.callId,
                reason: 'busy',
              });
            }
            return;
          }
          setIncomingCall(data);
          startIncomingTone();
          notifyIncoming({
            title: data.callerName,
            subtitle: data.kind === 'group' ? data.roomTitle : 'Cuộc gọi đến',
            body:
              data.mode === 'video'
                ? 'Đang gọi video cho bạn...'
                : 'Đang gọi thoại cho bạn...',
            tag: `call-${data.callId}`,
            roomId: data.roomId,
            onOpen: () => latestRef.current.openRoom(data.roomId),
          });
          return;
        }

        case 'started': {
          const data = event.data;
          if (incomingRef.current?.callId === data.callId) {
            setIncomingCall(null);
          }
          if (data.connectedAt) {
            stopCallTone();
          }
          setActiveCall({
            callId: data.callId,
            roomId: data.roomId,
            roomTitle: data.roomTitle,
            roomAvatarUrl: data.roomAvatarUrl,
            kind: data.kind,
            mode: data.mode,
            callerId: data.callerId,
            connectedAt: data.connectedAt ?? null,
          });
          return;
        }

        case 'peers': {
          const list = event.data;
          peerMapRef.current.clear();
          for (const p of list) {
            peerMapRef.current.set(p.socketId, p);
          }
          setPeers(list);
          if (list.length > 0) {
            stopCallTone();
            setActiveCall((cur) =>
              cur ? { ...cur, connectedAt: cur.connectedAt ?? Date.now() } : cur,
            );
          }
          for (const peer of list) {
            void ensurePc(peer).then(async (pc) => {
              if (pc.signalingState !== 'stable' || pc.localDescription) {
                return;
              }
              addRecvTransceivers(pc);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              latestRef.current.emitCall('call.signal', {
                to: peer.socketId,
                payload: { type: 'offer', sdp: offer } satisfies CallSignalPayload,
              });
            });
          }
          return;
        }

        case 'peer-joined': {
          const peer = event.data;
          stopCallTone();
          upsertPeer(peer);
          setActiveCall((cur) =>
            cur ? { ...cur, connectedAt: cur.connectedAt ?? Date.now() } : cur,
          );
          return;
        }

        case 'peer-media': {
          const patch = event.data;
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
          return;
        }

        case 'peer-left': {
          const { socketId } = event.data;
          pcsRef.current.get(socketId)?.close();
          pcsRef.current.delete(socketId);
          peerMapRef.current.delete(socketId);
          setPeers((current) => current.filter((item) => item.socketId !== socketId));
          setRemoteStreams((current) => {
            const next = { ...current };
            delete next[socketId];
            return next;
          });
          setPinnedId((cur) => (cur === socketId ? null : cur));
          return;
        }

        case 'signal': {
          const { from, userId, name, avatarUrl, payload } = event.data;
          const existingPeer = peerMapRef.current.get(from);
          const peerInfo: CallPeer = existingPeer ?? {
            socketId: from,
            userId: userId || '',
            name: name || 'Đồng nghiệp',
            avatarUrl: avatarUrl || '',
            micOn: true,
            camOn: false,
            sharing: false,
          };
          void (async () => {
            if (payload.type === 'offer' && payload.sdp) {
              const pc = await ensurePc(peerInfo);
              if (pc.signalingState !== 'stable') {
                await pc.setLocalDescription({ type: 'rollback' }).catch(() => undefined);
              }
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushIce(from, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              latestRef.current.emitCall('call.signal', {
                to: from,
                payload: { type: 'answer', sdp: answer } satisfies CallSignalPayload,
              });
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
                const queue = pendingIceRef.current.get(from) ?? [];
                queue.push(payload.candidate);
                pendingIceRef.current.set(from, queue);
                return;
              }
              await pc
                .addIceCandidate(new RTCIceCandidate(payload.candidate))
                .catch(() => undefined);
            }
          })();
          return;
        }

        case 'answered-elsewhere': {
          const { callId } = event.data;
          if (incomingRef.current?.callId === callId) {
            stopCallTone();
            setIncomingCall(null);
          }
          return;
        }

        case 'ended': {
          const { callId, roomId, reason } = event.data;
          if (incomingRef.current?.callId === callId) {
            stopCallTone();
            setIncomingCall(null);
          }
          const current = activeRef.current;
          if (
            current &&
            (current.callId === callId ||
              (current.callId.startsWith('pending-') && current.roomId === roomId))
          ) {
            playEndTone();
            if (reason === 'busy') {
              void antMessage.warning('Người nhận đang bận ở cuộc gọi khác.');
            } else if (reason === 'rejected') {
              void antMessage.info('Người nhận đã từ chối cuộc gọi.');
            } else if (reason === 'missed') {
              void antMessage.info('Không có phản hồi.');
            }
            cleanupCallResources();
          }
          return;
        }

        case 'error': {
          playEndTone();
          void antMessage.error(event.data.message || 'Không thực hiện được cuộc gọi.');
          if (activeRef.current?.callId.startsWith('pending-')) {
            cleanupCallResources();
          }
          return;
        }
      }
    };

    latestRef.current.setCallHandler(handleEvent);
    return () => {
      latestRef.current.setCallHandler(null);
    };
  }, [addRecvTransceivers, cleanupCallResources, ensurePc, flushIce, upsertPeer]);

  const startCall = useCallback(
    async (room: Room, mode: CallMode) => {
      if (room.isCloud) {
        return;
      }
      if (activeRef.current) {
        if (activeRef.current.roomId === room.id) {
          setMinimized(false);
          return;
        }
        latestRef.current.emitCall('call.leave');
        cleanupCallResources();
      }
      if (incomingRef.current) {
        stopCallTone();
        setIncomingCall(null);
      }

      const kind: CallKind = isDirectRoom(room) ? 'direct' : 'group';
      const roomTitle = room.title || room.name || 'Cuộc gọi';
      const roomAvatarUrl = room.avatarUrl ?? '';

      setMinimized(false);
      setActiveCall({
        callId: `pending-${room.id}`,
        roomId: room.id,
        roomTitle,
        roomAvatarUrl,
        kind,
        mode,
        callerId: latestRef.current.user.id,
        connectedAt: null,
      });
      startOutgoingTone();

      const wantVideo = mode === 'video';
      const { stream, hasMic, hasCam } = await acquireLocalMedia(wantVideo);
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(hasMic);
      setCamOn(wantVideo && hasCam);
      setSharing(false);

      latestRef.current.emitCall('call.start', {
        roomId: room.id,
        mode,
        micOn: hasMic,
        camOn: wantVideo && hasCam,
      });
    },
    [acquireLocalMedia, cleanupCallResources],
  );

  const joinExistingCall = useCallback(
    async (callId: string, roomId: string, mode: CallMode) => {
      if (activeRef.current?.callId === callId) {
        setMinimized(false);
        return;
      }
      if (activeRef.current) {
        latestRef.current.emitCall('call.leave');
        cleanupCallResources();
      }
      if (incomingRef.current) {
        stopCallTone();
        setIncomingCall(null);
      }

      const foundRoom = latestRef.current.rooms.find((r) => r.id === roomId);
      const kind: CallKind = foundRoom && !isDirectRoom(foundRoom) ? 'group' : 'direct';
      setMinimized(false);
      setActiveCall({
        callId,
        roomId,
        roomTitle: foundRoom ? foundRoom.title || foundRoom.name : 'Cuộc gọi',
        roomAvatarUrl: foundRoom?.avatarUrl ?? '',
        kind,
        mode,
        callerId: '',
        connectedAt: Date.now(),
      });

      const wantVideo = mode === 'video';
      const { stream, hasMic, hasCam } = await acquireLocalMedia(wantVideo);
      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(hasMic);
      setCamOn(wantVideo && hasCam);
      setSharing(false);

      latestRef.current.emitCall('call.join', {
        callId,
        roomId,
        micOn: hasMic,
        camOn: wantVideo && hasCam,
        sharing: false,
      });
    },
    [acquireLocalMedia, cleanupCallResources],
  );

  const acceptIncoming = useCallback(
    async (withVideo?: boolean) => {
      const incoming = incomingRef.current;
      if (!incoming) {
        return;
      }
      stopCallTone();
      setIncomingCall(null);

      if (activeRef.current) {
        latestRef.current.emitCall('call.leave');
        cleanupCallResources();
      }

      const wantVideo = withVideo ?? incoming.mode === 'video';
      setMinimized(false);
      setActiveCall({
        callId: incoming.callId,
        roomId: incoming.roomId,
        roomTitle: incoming.roomTitle,
        roomAvatarUrl: incoming.roomAvatarUrl,
        kind: incoming.kind,
        mode: incoming.mode,
        callerId: incoming.callerId,
        connectedAt: Date.now(),
      });

      const { stream, hasMic, hasCam } = await acquireLocalMedia(wantVideo);
      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(hasMic);
      setCamOn(wantVideo && hasCam);
      setSharing(false);

      latestRef.current.emitCall('call.join', {
        callId: incoming.callId,
        roomId: incoming.roomId,
        micOn: hasMic,
        camOn: wantVideo && hasCam,
        sharing: false,
      });
    },
    [acquireLocalMedia, cleanupCallResources],
  );

  const rejectIncoming = useCallback(() => {
    const incoming = incomingRef.current;
    if (!incoming) {
      return;
    }
    stopCallTone();
    setIncomingCall(null);
    latestRef.current.emitCall('call.reject', {
      callId: incoming.callId,
      reason: 'rejected',
    });
  }, []);

  const leaveCall = useCallback(() => {
    if (!activeRef.current) {
      return;
    }
    latestRef.current.emitCall('call.leave');
    playEndTone();
    cleanupCallResources();
  }, [cleanupCallResources]);

  const replaceVideo = useCallback(async (track: MediaStreamTrack | null) => {
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
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          latestRef.current.emitCall('call.signal', {
            to: socketId,
            payload: { type: 'offer', sdp: offer } satisfies CallSignalPayload,
          });
        }
      }
    }
  }, []);

  const replaceAudio = useCallback(async (track: MediaStreamTrack | null) => {
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
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          latestRef.current.emitCall('call.signal', {
            to: socketId,
            payload: { type: 'offer', sdp: offer } satisfies CallSignalPayload,
          });
        }
      }
    }
  }, []);

  const toggleMic = useCallback(async () => {
    const next = !mediaStateRef.current.micOn;
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
          setLocalStream(new MediaStream(current.getTracks()));
          await replaceAudio(track);
        }
      } catch {
        void antMessage.error('Không bật được micro.');
        return;
      }
    }
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  }, [audioDeviceId, replaceAudio]);

  const restoreCamera = useCallback(async () => {
    try {
      if (mediaStateRef.current.camOn) {
        const cam = await openCamera(false, { videoDeviceId });
        const next = cam.getVideoTracks()[0];
        const current = streamRef.current ?? new MediaStream();
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        if (next) {
          next.enabled = true;
          current.addTrack(next);
        }
        streamRef.current = current;
        setLocalStream(new MediaStream(current.getTracks()));
        await replaceVideo(next ?? null);
        setSharing(false);
      } else {
        const current = streamRef.current ?? new MediaStream();
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        streamRef.current = current;
        setLocalStream(new MediaStream(current.getTracks()));
        await replaceVideo(null);
        setSharing(false);
      }
    } catch {
      setSharing(false);
    }
  }, [replaceVideo, videoDeviceId]);

  const toggleCam = useCallback(async () => {
    if (mediaStateRef.current.camOn) {
      streamRef.current?.getVideoTracks().forEach((track) => {
        if (!mediaStateRef.current.sharing) {
          track.enabled = false;
        }
      });
      setCamOn(false);
      return;
    }
    if (mediaStateRef.current.sharing) {
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
        setLocalStream(new MediaStream(current.getTracks()));
        await replaceVideo(track ?? null);
      } catch {
        void antMessage.error('Không bật được camera.');
        return;
      }
    } else {
      track.enabled = true;
      setLocalStream(new MediaStream(streamRef.current?.getTracks() ?? []));
    }
    setCamOn(true);
  }, [replaceVideo, videoDeviceId]);

  const toggleShare = useCallback(async () => {
    if (mediaStateRef.current.sharing) {
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
      setLocalStream(new MediaStream(current.getTracks()));
      await replaceVideo(next ?? null);
      setSharing(true);
    } catch {
      void antMessage.info('Đã hủy chia sẻ màn hình.');
    }
  }, [replaceVideo, restoreCamera]);

  const selectAudioDevice = useCallback(
    async (deviceId: string) => {
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
        nextTrack.enabled = mediaStateRef.current.micOn;
        const current = streamRef.current ?? new MediaStream();
        current.getAudioTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        current.addTrack(nextTrack);
        streamRef.current = current;
        setLocalStream(new MediaStream(current.getTracks()));
        await replaceAudio(nextTrack);
      } catch {
        void antMessage.error('Không đổi được thiết bị micro.');
      }
    },
    [replaceAudio],
  );

  const selectVideoDevice = useCallback(
    async (deviceId: string) => {
      setVideoDeviceId(deviceId);
      if (mediaStateRef.current.sharing) {
        return;
      }
      try {
        const cam = await openCamera(false, { videoDeviceId: deviceId });
        const nextTrack = cam.getVideoTracks()[0];
        if (!nextTrack) {
          return;
        }
        nextTrack.enabled = mediaStateRef.current.camOn;
        const current = streamRef.current ?? new MediaStream();
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track);
          track.stop();
        });
        current.addTrack(nextTrack);
        streamRef.current = current;
        setLocalStream(new MediaStream(current.getTracks()));
        await replaceVideo(nextTrack);
      } catch {
        void antMessage.error('Không đổi được thiết bị camera.');
      }
    },
    [replaceVideo],
  );

  // Lắng nghe nút "Tham gia" / "Gọi lại" từ thẻ CallCard trong khung chat
  useEffect(() => {
    return onCallCardAction((action) => {
      if (action.action === 'join') {
        void joinExistingCall(action.callId, action.roomId, action.mode);
        return;
      }
      const existing = latestRef.current.rooms.find((r) => r.id === action.roomId);
      if (existing) {
        void startCall(existing, action.mode);
        return;
      }
      void api
        .room(action.roomId)
        .then((loaded) => startCall(loaded, action.mode))
        .catch(() => {
          void antMessage.error('Không tìm thấy cuộc trò chuyện.');
        });
    });
  }, [joinExistingCall, startCall]);

  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, [cleanupCallResources]);

  return {
    incomingCall,
    activeCall,
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
    startCall,
    joinExistingCall,
    acceptIncoming,
    rejectIncoming,
    leaveCall,
    toggleMic,
    toggleCam,
    toggleShare,
    selectAudioDevice,
    selectVideoDevice,
    setMinimized,
    setPinnedId,
  };
}
