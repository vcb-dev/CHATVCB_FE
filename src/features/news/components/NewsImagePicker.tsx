import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Modal, Select, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { apiErrorText } from '@/lib/errors';
import type { NewsImage } from '@/types';

function GalleryPhotos(props: { busy: boolean; onPick: (photoId: string) => void }) {
  const [albumId, setAlbumId] = useState('');
  const { data: albums = [] } = useQuery({
    queryKey: queryKeys.galleryAlbums,
    queryFn: () => api.galleryAlbums(),
  });
  const query = useInfiniteQuery({
    queryKey: queryKeys.newsPickerPhotos(albumId),
    // Bản tin ai cũng xem được, nên chỉ cho chọn ảnh public
    queryFn: ({ pageParam }) =>
      api.galleryPhotos({ albumId: albumId || undefined, visibility: 'public', cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const photos = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return (
    <div className="news-picker-library">
      <Select
        className="news-picker-album"
        value={albumId}
        onChange={setAlbumId}
        options={[
          { value: '', label: 'Tất cả album' },
          { value: 'none', label: 'Chưa xếp album' },
          ...albums.map((album) => ({ value: album.id, label: album.name })),
        ]}
      />
      {query.isLoading ? <Spin className="news-loading" /> : null}
      {!query.isLoading && !photos.length ? <Empty description="Chưa có ảnh" /> : null}
      <div className="news-picker-grid">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="news-picker-photo"
            disabled={props.busy}
            onClick={() => props.onPick(photo.id)}
          >
            <img src={photo.thumbUrl} alt={photo.caption} loading="lazy" />
          </button>
        ))}
      </div>
      {query.hasNextPage ? (
        <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Xem thêm
        </Button>
      ) : null}
    </div>
  );
}

/** Chọn một ảnh public trong Thư viện ảnh; ảnh từ máy thì hộp đăng bài tự tải */
export function NewsImagePicker(props: {
  postId: string;
  onClose: () => void;
  onPicked: (image: NewsImage) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<(() => void) | null>(null);

  async function run(action: () => Promise<NewsImage>) {
    setBusy(true);
    setError('');
    setRetry(null);
    try {
      props.onPicked(await action());
    } catch (err) {
      setError(apiErrorText(err, 'Không tải được ảnh. Kiểm tra kết nối rồi thử lại.'));
      setRetry(() => () => void run(action));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      className="news-picker"
      title="Chọn ảnh từ Thư viện ảnh"
      footer={null}
      width={720}
      onCancel={props.onClose}
    >
      {error ? (
        <Alert
          className="news-picker-error"
          type="error"
          title={error}
          action={
            retry ? (
              <Button size="small" onClick={retry}>
                Thử lại
              </Button>
            ) : null
          }
        />
      ) : null}
      <GalleryPhotos
        busy={busy}
        onPick={(photoId) => void run(() => api.newsImageFromGallery(props.postId, photoId))}
      />
    </Modal>
  );
}
