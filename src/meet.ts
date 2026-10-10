export const CAMERA = {
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

export const CAMERA_ONLY = {
  video: CAMERA.video,
  audio: false as const,
};

export async function openCamera(withAudio = true) {
  const stream = await navigator.mediaDevices.getUserMedia(withAudio ? CAMERA : CAMERA_ONLY);
  const video = stream.getVideoTracks()[0];
  if (video) {
    await video.applyConstraints({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    }).catch(() => undefined);
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

export function meetTabUrl(code?: string) {
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
