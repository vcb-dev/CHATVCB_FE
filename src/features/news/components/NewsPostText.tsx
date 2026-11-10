import { useLayoutEffect, useRef, useState } from 'react';
import type { NewsBlock } from '@/types';
import { titleRepeats } from '../utils/compose';
import { NewsText } from './NewsText';

export function NewsPostText(props: { title: string; blocks: NewsBlock[] }) {
  const { blocks } = props;
  const title = titleRepeats(props.title, blocks) ? '' : props.title;
  const [expanded, setExpanded] = useState(false);
  const [cutHeight, setCutHeight] = useState<number | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) {
      return;
    }
    const line = parseFloat(getComputedStyle(el).lineHeight);
    if (el.scrollHeight > line * 6) {
      const top = el.getBoundingClientRect().top;
      const limit = line * 5;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let cut = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          const bottom = rect.bottom - top;
          if (bottom <= limit + 1 && bottom > cut) cut = bottom;
        }
      }
      setCutHeight(Math.ceil(cut));
    } else {
      setCutHeight(null);
    }
  }, [title, blocks]);

  const isCollapsed = cutHeight !== null && !expanded;

  return (
    <>
      <div
        ref={textRef}
        className={`news-post-text${isCollapsed ? ' collapsed' : ''}`}
        style={isCollapsed && cutHeight !== null ? { maxHeight: cutHeight } : undefined}
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
