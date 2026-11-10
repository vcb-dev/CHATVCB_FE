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

  const gridCount = Math.min(count, 5);
  const visibleImages = images.slice(0, Math.min(count, NEWS_GRID_MAX));

  return (
    <Image.PreviewGroup
      items={images.map((img) => img.image.url)}
      preview={{
        open,
        current,
        onOpenChange: (val) => setOpen(val),
        onChange: (curr) => setCurrent(curr),
        imageRender: (originalNode, info) => {
          const idx = info?.current ?? current;
          const caption = images[idx]?.caption;
          return (
            <>
              {originalNode}
              {caption ? (
                <div className="news-grid-caption">{caption}</div>
              ) : null}
            </>
          );
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
            {index === 4 && count > 5 ? (
              <span className="news-grid-more">+{count - 5}</span>
            ) : null}
          </button>
        ))}
      </div>
    </Image.PreviewGroup>
  );
}
