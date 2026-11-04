const CAMERA = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    facingMode: 'user',
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 360 },
    frameRate: { ideal: 30, max: 30 },
    aspectRatio: { ideal: 16 / 9 },
  },
} as const;

export type MediaDeviceList = {
  mics: MediaDeviceInfo[];
  cams: MediaDeviceInfo[];
};

export async function listMediaDevices(): Promise<MediaDeviceList> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { mics: [], cams: [] };
  }
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      mics: all.filter((d) => d.kind === 'audioinput'),
      cams: all.filter((d) => d.kind === 'videoinput'),
    };
  } catch {
    return { mics: [], cams: [] };
  }
}

export async function openCamera(
  withAudio = true,
  opts?: { audioDeviceId?: string; videoDeviceId?: string },
) {
  const audioConstraint = withAudio
    ? {
        ...CAMERA.audio,
        ...(opts?.audioDeviceId ? { deviceId: { exact: opts.audioDeviceId } } : {}),
      }
    : (false as const);
  const videoConstraint = {
    ...CAMERA.video,
    ...(opts?.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : {}),
  };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraint,
      video: videoConstraint,
    });
  } catch (err) {
    if (!withAudio) {
      throw err;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraint,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: false,
      });
    }
  }

  const video = stream.getVideoTracks()[0];
  if (video) {
    await video
      .applyConstraints({
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      })
      .catch(() => undefined);
  }
  return stream;
}

export function parseMeetHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.startsWith('/meet')) {
    return null;
  }
  const query = new URLSearchParams(raw.split('?')[1] || '');
  return { code: query.get('code') || undefined };
}

function meetTabUrl(code?: string) {
  const next = new URL(window.location.href);
  next.hash = code ? `/meet?code=${encodeURIComponent(code)}` : '/meet';
  return next.toString();
}

export function openMeetTab(code?: string) {
  const opened = window.open(meetTabUrl(code), '_blank');
  if (!opened) {
    window.location.hash = code ? `/meet?code=${encodeURIComponent(code)}` : '/meet';
  }
}

export function closeMeetTab() {
  if (window.opener || window.history.length <= 1) {
    window.close();
  }
  if (!window.closed) {
    window.location.hash = '';
  }
}
