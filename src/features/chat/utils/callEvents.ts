import type {
  CallAnsweredElsewhereEvent,
  CallEndedEvent,
  CallErrorEvent,
  CallIncomingEvent,
  CallMode,
  CallPeer,
  CallPeerLeftEvent,
  CallPeerMediaEvent,
  CallSignalEvent,
  CallStartedEvent,
} from '@/types';

export type CallSocketEvent =
  | { type: 'incoming'; data: CallIncomingEvent }
  | { type: 'started'; data: CallStartedEvent }
  | { type: 'peers'; data: CallPeer[] }
  | { type: 'peer-joined'; data: CallPeer }
  | { type: 'peer-left'; data: CallPeerLeftEvent }
  | { type: 'peer-media'; data: CallPeerMediaEvent }
  | { type: 'signal'; data: CallSignalEvent }
  | { type: 'ended'; data: CallEndedEvent }
  | { type: 'answered-elsewhere'; data: CallAnsweredElsewhereEvent }
  | { type: 'error'; data: CallErrorEvent };

export type CallCardAction =
  | { action: 'join'; callId: string; roomId: string; mode: CallMode }
  | { action: 'redial'; roomId: string; mode: CallMode };

const CALL_CARD_EVENT = 'chatvcb:call-card-action';

export function dispatchCallCardAction(detail: CallCardAction) {
  window.dispatchEvent(new CustomEvent<CallCardAction>(CALL_CARD_EVENT, { detail }));
}

export function onCallCardAction(handler: (action: CallCardAction) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CallCardAction>).detail;
    if (detail) {
      handler(detail);
    }
  };
  window.addEventListener(CALL_CARD_EVENT, listener);
  return () => window.removeEventListener(CALL_CARD_EVENT, listener);
}

export function formatCallClock(sec = 0): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}
