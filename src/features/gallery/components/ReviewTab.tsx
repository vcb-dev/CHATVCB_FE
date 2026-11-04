import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input, Modal, Segmented, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { GalleryAlbum, GalleryPhoto, GalleryVisibility } from '@/types';
import { savePhoto } from '../utils/savePhoto';
import { PhotoViewer } from './PhotoViewer';

function ReviewCard(props: {
  photo: GalleryPhoto;
  albums: GalleryAlbum[];
  onView: () => void;
  onReject: () => void;
  onDone: () => Promise<unknown>;
}) {
  const { photo, albums, onView, onReject, onDone } = props;
  const [albumId, setAlbumId] = useState<string | null>(photo.albumId);
  const [visibility, setVisibility] = useState<GalleryVisibility>(photo.visibility);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await api.approveGalleryPhoto(photo.id, { albumId, visibility });
    } catch (err) {
      message.error(errorText(err, 'Không duyệt được ảnh.'));
    } finally {
      await onDone();
      setBusy(false);
    }
  }

  return (
    <div className="gallery-review-card">
      <button type="button" className="gallery-review-thumb" onClick={onView}>
        <img src={photo.thumbUrl} alt={photo.caption || photo.filename} loading="lazy" />
      </button>
      <div className="gallery-review-body">
        <strong>{photo.uploader?.name ?? 'Người dùng cũ'}</strong>
        <small>{photo.filename}</small>
        {photo.caption ? <p>{photo.caption}</p> : null}
        <Select
          allowClear
          placeholder="Chưa xếp album"
          value={albumId ?? undefined}
          onChange={(value?: string) => setAlbumId(value ?? null)}
          options={albums.map((album) => ({ value: album.id, label: album.name }))}
        />
        <Segmented<GalleryVisibility>
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
        />
        <div className="gallery-review-actions">
          <Button type="primary" loading={busy} onClick={() => void approve()}>
            Duyệt
          </Button>
          <Button danger disabled={busy} onClick={onReject}>
            Từ chối
          </Button>
          <Button onClick={() => void savePhoto(photo)}>Lưu ảnh</Button>
        </div>
      </div>
    </div>
  );
}

export function ReviewTab() {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<GalleryPhoto | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const { data: albums = [] } = useQuery({
    queryKey: queryKeys.galleryAlbums,
    queryFn: () => api.galleryAlbums(),
  });
  const query = useInfiniteQuery({
    queryKey: queryKeys.galleryReview,
    queryFn: ({ pageParam }) => api.galleryReviewPhotos(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const photos = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.galleryLibrary });

  async function reject() {
    if (!rejecting) {
      return;
    }
    setSending(true);
    try {
      await api.rejectGalleryPhoto(rejecting.id, reason.trim());
    } catch (err) {
      message.error(errorText(err, 'Không từ chối được ảnh.'));
    } finally {
      setRejecting(null);
      setReason('');
      setSending(false);
      await refresh();
    }
  }

  return (
    <div>
      {!query.isLoading && !photos.length ? <Empty description="Không có ảnh chờ duyệt" /> : null}
      <div className="gallery-review-list">
        {photos.map((photo) => (
          <ReviewCard
            key={photo.id}
            photo={photo}
            albums={albums}
            onView={() => setViewing(photo.id)}
            onReject={() => setRejecting(photo)}
            onDone={refresh}
          />
        ))}
      </div>
      {query.hasNextPage ? (
        <div className="gallery-more">
          <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            Tải thêm
          </Button>
        </div>
      ) : null}
      <PhotoViewer
        photos={photos}
        photoId={viewing}
        onClose={() => setViewing(null)}
        onSelect={setViewing}
      />
      <Modal
        open={Boolean(rejecting)}
        title="Từ chối ảnh"
        wrapClassName="gallery-reject-modal"
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        cancelText="Hủy"
        confirmLoading={sending}
        destroyOnHidden
        onOk={() => void reject()}
        onCancel={() => {
          setRejecting(null);
          setReason('');
        }}
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder="Lý do từ chối (bắt buộc)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
