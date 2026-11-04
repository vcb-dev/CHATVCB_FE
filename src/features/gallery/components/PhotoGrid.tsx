import { DownloadOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import type { GalleryPhoto } from '@/types';
import { savePhoto } from '../utils/savePhoto';

export function PhotoGrid(props: {
  photos: GalleryPhoto[];
  onOpen: (photoId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  badge?: (photo: GalleryPhoto) => React.ReactNode;
}) {
  return (
    <>
      <div className="gallery-grid-photos">
        {props.photos.map((photo) => (
          <div key={photo.id} className="gallery-photo-cell">
            <button
              type="button"
              className="gallery-photo"
              onClick={() => props.onOpen(photo.id)}
            >
              <img src={photo.thumbUrl} alt={photo.caption || photo.filename} loading="lazy" />
              <span className="gallery-photo-tags">
                {photo.visibility === 'private' ? <Tag color="gold">Private</Tag> : null}
                {props.badge?.(photo)}
              </span>
            </button>
            <Button
              className="gallery-photo-save"
              size="small"
              shape="circle"
              icon={<DownloadOutlined />}
              aria-label="Lưu ảnh"
              title="Lưu ảnh"
              onClick={() => void savePhoto(photo)}
            />
          </div>
        ))}
      </div>
      {props.hasMore ? (
        <div className="gallery-more">
          <Button onClick={props.onLoadMore} loading={props.loading}>
            Tải thêm
          </Button>
        </div>
      ) : null}
    </>
  );
}
