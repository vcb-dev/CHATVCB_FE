let activeCtx: AudioContext | null = null;
let activeTimer: number | null = null;

function createAudioContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

export function stopCallTone() {
  if (activeTimer !== null) {
    window.clearInterval(activeTimer);
    activeTimer = null;
  }
  if (activeCtx) {
    const ctx = activeCtx;
    activeCtx = null;
    void ctx.close().catch(() => undefined);
  }
}

function playChord(
  ctx: AudioContext,
  freqs: number[],
  startSec: number,
  durationSec: number,
  peakGain = 0.08,
) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startSec);
  gain.gain.exponentialRampToValueAtTime(peakGain, startSec + 0.03);
  gain.gain.setValueAtTime(peakGain, Math.max(startSec + 0.04, startSec + durationSec - 0.05));
  gain.gain.exponentialRampToValueAtTime(0.0001, startSec + durationSec);
  gain.connect(ctx.destination);

  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startSec);
    osc.connect(gain);
    osc.start(startSec);
    osc.stop(startSec + durationSec + 0.02);
  }
}

/** Nhạc chờ (tút... tút...) cho người đang gọi đi. */
export function startOutgoingTone() {
  stopCallTone();
  const ctx = createAudioContext();
  if (!ctx) {
    return;
  }
  activeCtx = ctx;
  const ringOnce = () => {
    if (activeCtx !== ctx) {
      return;
    }
    void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime + 0.02;
    playChord(ctx, [440, 480], now, 1.1, 0.05);
  };
  ringOnce();
  activeTimer = window.setInterval(ringOnce, 3000);
}

/** Nhạc chuông cho người nhận cuộc gọi đến. */
export function startIncomingTone() {
  stopCallTone();
  const ctx = createAudioContext();
  if (!ctx) {
    return;
  }
  activeCtx = ctx;
  const chimeOnce = () => {
    if (activeCtx !== ctx) {
      return;
    }
    void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime + 0.02;
    playChord(ctx, [523.25, 659.25], now, 0.22, 0.08);
    playChord(ctx, [659.25, 783.99], now + 0.26, 0.22, 0.08);
    playChord(ctx, [783.99, 1046.5], now + 0.52, 0.36, 0.09);
  };
  chimeOnce();
  activeTimer = window.setInterval(chimeOnce, 2400);
}

/** Âm ngắn khi kết thúc cuộc gọi hoặc báo bận. */
export function playEndTone() {
  stopCallTone();
  const ctx = createAudioContext();
  if (!ctx) {
    return;
  }
  try {
    void ctx.resume().catch(() => undefined);
    const now = ctx.currentTime + 0.01;
    playChord(ctx, [480], now, 0.14, 0.05);
    playChord(ctx, [360], now + 0.17, 0.18, 0.05);
    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 500);
  } catch {
    void ctx.close().catch(() => undefined);
  }
}
