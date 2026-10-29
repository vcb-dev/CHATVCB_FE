import { useCallback, useEffect, useRef } from 'react';

const TYPING_THROTTLE_MS = 3000;
const TYPING_IDLE_MS = 4000;

export function useTypingSignal({
  roomId,
  draft,
  emitTyping,
}: {
  roomId: string;
  draft: string;
  emitTyping: (roomId: string, active: boolean) => void;
}) {
  const activeRoomRef = useRef('');
  const lastSentRef = useRef(0);
  const idleTimerRef = useRef(0);
  const prevDraftRef = useRef(draft);

  const stop = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    if (activeRoomRef.current) {
      emitTyping(activeRoomRef.current, false);
      activeRoomRef.current = '';
    }
  }, [emitTyping]);

  useEffect(() => {
    if (draft === prevDraftRef.current) {
      return;
    }
    prevDraftRef.current = draft;
    if (!roomId || !draft.trim()) {
      stop();
      return;
    }
    const now = Date.now();
    if (activeRoomRef.current !== roomId || now - lastSentRef.current >= TYPING_THROTTLE_MS) {
      emitTyping(roomId, true);
      activeRoomRef.current = roomId;
      lastSentRef.current = now;
    }
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(stop, TYPING_IDLE_MS);
  }, [draft]);

  useEffect(() => () => stop(), [roomId]);
}
