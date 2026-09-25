import type { ReactNode } from 'react';

const MENTION = /(@[A-Za-z0-9._-]+)/g;
const OPEN_MENTION = /(?:^|[\s])@([A-Za-z0-9._-]*)$/;

export function handleFromEmail(email?: string) {
  return email?.split('@')[0] ?? '';
}

export function mentionOpen(draft: string) {
  return OPEN_MENTION.test(draft);
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
