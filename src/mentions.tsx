import type { ReactNode } from 'react';
import type { PresenceUser, Room, RoomMember } from './types';

const MENTION = /(@[A-Za-z0-9._-]+)/g;
const OPEN_MENTION = /(?:^|[\s])@([A-Za-z0-9._-]*)$/;

export function handleFromEmail(email?: string) {
  return email?.split('@')[0] ?? '';
}

export function mentionOpen(draft: string) {
  return OPEN_MENTION.test(draft);
}

/** Gộp thành viên phòng (API) + đang online (socket) để ô @ luôn có người tag. */
export function buildMentionOptions(
  members: RoomMember[],
  online: PresenceUser[],
  userId: string,
  room: Room | null,
) {
  const map = new Map<string, { value: string; label: string }>();
  for (const item of members) {
    if (item.id === userId || !item.handle) {
      continue;
    }
    map.set(item.handle, {
      value: item.handle,
      label: `${item.name} (@${item.handle})`,
    });
  }
  for (const item of online) {
    if (item.id === userId || !item.handle) {
      continue;
    }
    if (!map.has(item.handle)) {
      map.set(item.handle, {
        value: item.handle,
        label: `${item.name} (@${item.handle})`,
      });
    }
  }
  const agentName = room?.agentName;
  const agents = agentName
    ? [
        { value: agentName, label: `${agentName} (AI)` },
        { value: 'agent', label: '@agent (AI)' },
      ]
    : [];
  return [...map.values(), ...agents];
}

export function mentionsUser(content: string, handle: string) {
  if (!handle) {
    return false;
  }
  const token = `@${handle}`.toLowerCase();
  return content
    .split(MENTION)
    .some((part) => part.toLowerCase() === token);
}

export function MentionText({
  text,
  myHandle,
}: {
  text: string;
  myHandle: string;
}) {
  const parts = text.split(MENTION);
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (!part.startsWith('@')) {
      return part;
    }
    const mine = part.slice(1).toLowerCase() === myHandle.toLowerCase();
    return (
      <span key={`${part}-${index}`} className={mine ? 'mention mention-me' : 'mention'}>
        {part}
      </span>
    );
  });
  return <p>{nodes}</p>;
}
