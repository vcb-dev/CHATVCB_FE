import { useLayoutEffect, useRef, useState } from 'react';
import type { NewsBlock } from '@/types';
import { NewsText } from './NewsText';

export function NewsPostText(props: { title: string; blocks: NewsBlock[] }) {
  const { title, blocks } = props;
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) {
      return;
    }
    const computed = getComputedStyle(el);
    const line =
      parseFloat(computed.lineHeight) ||
      parseFloat(computed.fontSize) * 1.4 ||
      21;
    if (el.scrollHeight > line * 6) {
      setCanCollapse(true);
    } else {
      setCanCollapse(false);
    }
  }, [title, blocks]);

  const isCollapsed = canCollapse && !expanded;

  return (
    <>
      <div
        ref={textRef}
        className={`news-post-text${isCollapsed ? ' collapsed' : ''}`}
      >
        {title ? <div className="news-post-title">{title}</div> : null}
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            return (
              <div key={index} className="news-post-heading">
                {block.text}
              </div>
            );
          }
          if (block.type === 'paragraph') {
            return (
              <div key={index} className="news-post-paragraph">
                <NewsText text={block.text} />
              </div>
            );
          }
          return null;
        })}
      </div>
      {isCollapsed ? (
        <button
          type="button"
          className="news-post-more"
          onClick={() => setExpanded(true)}
        >
          Xem thêm
        </button>
      ) : null}
    </>
  );
}
