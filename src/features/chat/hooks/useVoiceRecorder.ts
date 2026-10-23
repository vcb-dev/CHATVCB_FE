import { useEffect, useRef, useState } from 'react';
import { message as antMessage } from 'antd';

export const VOICE_MAX_MS = 5 * 60 * 1000;
export const VOICE_MIN_MS = 1000;

const FORMATS = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export interface UseVoiceRecorderOptions {
  roomId: string;
  onDone: (blob: Blob, durationMs: number) => void;
}

export function useVoiceRecorder({ roomId, onDone }: UseVoiceRecorderOptions) {
  const supported =
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const [state, setState] = useState<'idle' | 'recording'>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setState('idle');
    setElapsedMs(0);
  };

  const cancel = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    cleanup();
  };

  const stop = () => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('idle');
  };

  const start = async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isCancelledRef.current = false;
      chunksRef.current = [];

      const mimeType = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const tracks = streamRef.current?.getTracks() ?? [];
        tracks.forEach((track) => track.stop());
        streamRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (isCancelledRef.current) {
          chunksRef.current = [];
          setElapsedMs(0);
          setState('idle');
          return;
        }

        const durationMs = Date.now() - startTimeRef.current;
        const recordedBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        setElapsedMs(0);
        setState('idle');

        if (durationMs < VOICE_MIN_MS) {
          void antMessage.info('Tin nhắn thoại quá ngắn.');
        } else {
          onDoneRef.current(recordedBlob, durationMs);
        }
      };

      startTimeRef.current = Date.now();
      recorder.start(250);
      setState('recording');
      setElapsedMs(0);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= VOICE_MAX_MS) {
          stop();
        }
      }, 200);
    } catch {
      void antMessage.error('Không dùng được micro. Hãy cho phép truy cập micro.');
      setState('idle');
    }
  };

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [roomId]);

  return {
    supported,
    state,
    elapsedMs,
    start,
    stop,
    cancel,
  };
}
