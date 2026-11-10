import { Image } from 'antd';
import { useState } from 'react';
import { NEWS_GRID_MAX, type FeedImage } from '../utils/feed';

export function NewsImageGrid({ images }: { images: FeedImage[] }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const count = images.length;
  if (count === 0) {
    return null;
  }

  const gridCount = Math.min(count, NEWS_GRID_MAX);
  const visibleImages = images.slice(0, gridCount);

  return (
    <Image.PreviewGroup
      items={images.map((img) => img.image.url)}
      preview={{
        open,
        current,
        onOpenChange: (val) => setOpen(val),
        onChange: (curr) => setCurrent(curr),
        countRender: (curr, total) => {
          const caption = images[curr - 1]?.caption;
          return caption ? `${curr} / ${total} · ${caption}` : `${curr} / ${total}`;
        },
      }}
    >
      <div className={`news-grid n${gridCount}`}>
        {visibleImages.map((item, index) => (
          <button
            key={item.image.id}
            type="button"
            className="news-grid-cell"
            onClick={() => {
              setCurrent(index);
              setOpen(true);
            }}
          >
            <img src={item.image.displayUrl} loading="lazy" alt="" />
            {index === NEWS_GRID_MAX - 1 && count > NEWS_GRID_MAX ? (
              <span className="news-grid-more">+{count - NEWS_GRID_MAX}</span>
            ) : null}
          </button>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
