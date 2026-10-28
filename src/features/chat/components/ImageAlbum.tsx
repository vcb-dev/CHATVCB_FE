import type { MouseEvent } from 'react';
import { Image } from 'antd';
import { fileSrc } from '@/api/client';

type Props = {
  images: { id: string; url: string }[];
  onOpen: () => void;
};

export function ImageAlbum({ images, onOpen }: Props) {
  const cols = images.length === 2 || images.length === 4 ? 2 : 3;

  return (
    <div className={`image-album cols-${cols}`}>
      <Image.PreviewGroup>
        {images.map((img) => (
          <Image
            key={img.id}
            src={fileSrc(img.url)}
            alt=""
            className="album-photo"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              onOpen();
            }}
          />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
