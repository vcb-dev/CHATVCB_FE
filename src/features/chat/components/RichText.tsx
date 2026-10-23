import { Fragment, type ReactNode, useMemo } from 'react';
import { parseRichText } from '../utils/format';
import { MENTION } from '../utils/mentions';
import type { RichInline } from '@/types';

function renderInline(node: RichInline, myHandle: string, key: string | number): ReactNode {
  switch (node.type) {
    case 'text': {
      const parts = node.text.split(MENTION);
      return (
        <Fragment key={key}>
          {parts.map((part, index) => {
            if (!part.startsWith('@')) {
              return part;
            }
            const mine = part.slice(1).toLowerCase() === myHandle.toLowerCase();
            return (
              <span key={`${part}-${index}`} className={mine ? 'mention mention-me' : 'mention'}>
                {part}
              </span>
            );
          })}
        </Fragment>
      );
    }
    case 'bold':
      return (
        <strong key={key}>
          {node.children.map((child, idx) => renderInline(child, myHandle, idx))}
        </strong>
      );
    case 'italic':
      return (
        <em key={key}>
          {node.children.map((child, idx) => renderInline(child, myHandle, idx))}
        </em>
      );
    case 'strike':
      return (
        <s key={key}>
          {node.children.map((child, idx) => renderInline(child, myHandle, idx))}
        </s>
      );
    case 'code':
      return (
        <code key={key} className="rt-inline-code">
          {node.text}
        </code>
      );
    case 'link':
      return (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {node.url}
        </a>
      );
  }
}

export function RichText({ text, myHandle }: { text: string; myHandle: string }) {
  const blocks = useMemo(() => parseRichText(text), [text]);

  return (
    <div className="rich-text">
      {blocks.map((block, idx) => {
        if (block.type === 'paragraph') {
          return (
            <p key={idx}>
              {block.lines.map((line, lineIdx) => (
                <Fragment key={lineIdx}>
                  {lineIdx > 0 ? <br /> : null}
                  {line.map((item, itemIdx) => renderInline(item, myHandle, itemIdx))}
                </Fragment>
              ))}
            </p>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={idx} className="rt-code">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={idx} className="rt-list">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {item.map((inline, inlineIdx) => renderInline(inline, myHandle, inlineIdx))}
                </li>
              ))}
            </ListTag>
          );
        }
        return null;
      })}
    </div>
  );
}
