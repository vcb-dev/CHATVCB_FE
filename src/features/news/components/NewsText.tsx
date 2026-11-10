import { textParts } from '@/lib/links';

export function NewsText({ text }: { text: string }) {
  return (
    <>
      {textParts(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
