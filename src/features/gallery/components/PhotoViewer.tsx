import { DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Segmented, Select, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type {
  GalleryPhoto,
  GalleryPhotoPatch,
  GalleryPhotoStatus,
  GalleryVisibility,
} from '@/types';
import { savePhoto } from '../utils/savePhoto';

const REMOVE_WORD: Record<GalleryPhotoStatus, string> = {
  pending: 'Rút',
  approved: 'Gỡ',
  rejected: 'Xóa',
};

export function PhotoViewer(props: {
  photos: GalleryPhoto[];
  photoId: string | null;
  onClose: () => void;
  onSelect: (photoId: string) => void;
}) {
  const { photos, photoId, onClose, onSelect } = props;
  const queryClient = useQueryClient();
  // Theo id, không theo vị trí: danh sách co lại vì người khác thao tác thì vẫn đúng ảnh đang xem
  const index = photos.findIndex((item) => item.id === photoId);
  const photo = index >= 0 ? photos[index] : null;
  const [caption, setCaption] = useState('');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: albums = [] } = useQuery({
    queryKey: queryKeys.galleryAlbums,
    queryFn: () => api.galleryAlbums(),
    enabled: Boolean(photo?.canEditDetails),
  });

  const savedCaption = photo?.caption ?? '';
  const savedAlbumId = photo?.albumId ?? null;
  useEffect(() => {
    setCaption(savedCaption);
    setAlbumId(savedAlbumId);
  }, [photoId, savedCaption, savedAlbumId]);

  // Ảnh đang xem biến mất khỏi danh sách, ví dụ vừa chuyển sang album khác
  useEffect(() => {
    if (photoId && !photo) {
      onClose();
    }
  }, [photoId, photo, onClose]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.galleryLibrary });

  async function patch(change: GalleryPhotoPatch) {
    if (!photo) {
      return;
    }
    setSaving(true);
    try {
      await api.updateGalleryPhoto(photo.id, change);
      await refresh();
    } catch (err) {
      message.error(errorText(err, 'Không sửa được ảnh.'));
    } finally {
      setSaving(false);
    }
  }

  function askRemove() {
    if (!photo) {
      return;
    }
    const word = REMOVE_WORD[photo.status];
    Modal.confirm({
      title: `${word} ảnh này?`,
      content: 'Ảnh sẽ bị xóa hẳn và không khôi phục được.',
      okText: word,
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.deleteGalleryPhoto(photo.id);
          onClose();
          await refresh();
        } catch (err) {
          message.error(errorText(err, 'Không gỡ được ảnh.'));
        }
      },
    });
  }

  return (
    <Modal
      open={Boolean(photo)}
      onCancel={onClose}
      footer={null}
      width={960}
      centered
      destroyOnHidden
      title={photo?.filename}
    >
      {photo ? (
        <div className="gallery-viewer">
          <div className="gallery-viewer-stage">
            {index > 0 ? (
              <Button
                className="gallery-viewer-prev"
                shape="circle"
                icon={<LeftOutlined />}
                aria-label="Ảnh trước"
                onClick={() => onSelect(photos[index - 1].id)}
              />
            ) : null}
            <img src={photo.url} alt={photo.caption || photo.filename} />
            {index < photos.length - 1 ? (
              <Button
                className="gallery-viewer-next"
                shape="circle"
                icon={<RightOutlined />}
                aria-label="Ảnh sau"
                onClick={() => onSelect(photos[index + 1].id)}
              />
            ) : null}
          </div>
          <div className="gallery-viewer-info">
            <div className="gallery-viewer-owner">
              Người gửi: {photo.uploader?.name ?? 'Người dùng cũ'}
            </div>
            {photo.rejectReason ? (
              <div className="gallery-reject-reason">Lý do từ chối: {photo.rejectReason}</div>
            ) : null}
            {photo.canEditDetails ? (
              <>
                <Input.TextArea
                  rows={2}
                  maxLength={300}
                  placeholder="Mô tả"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
                <Select
                  allowClear
                  placeholder="Chưa xếp album"
                  value={albumId ?? undefined}
                  onChange={(value?: string) => setAlbumId(value ?? null)}
                  options={albums.map((album) => ({ value: album.id, label: album.name }))}
                />
                <Button
                  loading={saving}
                  onClick={() => void patch({ caption, albumId })}
                >
                  Lưu thông tin
                </Button>
              </>
            ) : photo.caption ? (
              <p className="gallery-viewer-caption">{photo.caption}</p>
            ) : null}
            <div className="gallery-viewer-actions">
              {photo.canEdit ? (
                <Segmented<GalleryVisibility>
                  value={photo.visibility}
                  disabled={saving}
                  options={[
                    { value: 'public', label: 'Public' },
                    { value: 'private', label: 'Private' },
                  ]}
                  onChange={(visibility) => void patch({ visibility })}
                />
              ) : null}
              <Button icon={<DownloadOutlined />} onClick={() => void savePhoto(photo)}>
                Lưu ảnh
              </Button>
              {photo.canDelete ? (
                <Button danger onClick={askRemove}>
                  {REMOVE_WORD[photo.status]} ảnh
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
