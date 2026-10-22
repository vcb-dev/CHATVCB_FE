import type { ReactNode } from 'react';
import { MENTION } from '../utils/mentions';

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
