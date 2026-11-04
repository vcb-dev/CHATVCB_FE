import { useInfiniteQuery } from '@tanstack/react-query';
import { Empty, Segmented, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { GalleryPhoto } from '@/types';
import { PhotoGrid } from './PhotoGrid';
import { PhotoViewer } from './PhotoViewer';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

function statusBadge(photo: GalleryPhoto) {
  if (photo.status === 'pending') {
    return <Tag color="blue">Chờ duyệt</Tag>;
  }
  if (photo.status === 'approved') {
    return <Tag color="green">Đã duyệt</Tag>;
  }
  return (
    <>
      <Tag color="red">Từ chối</Tag>
      <span className="gallery-photo-reason">{photo.rejectReason}</span>
    </>
  );
}

export function MyPhotosTab() {
  const [status, setStatus] = useState('all');
  const [viewing, setViewing] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: queryKeys.galleryMine(status),
    queryFn: ({ pageParam }) =>
      api.myGalleryPhotos({
        status: status === 'all' ? undefined : status,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const photos = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return (
    <div>
      <div className="gallery-album-bar">
        <Segmented
          value={status}
          options={FILTERS}
          onChange={(next) => {
            setStatus(next);
            setViewing(null);
          }}
        />
      </div>
      {!query.isLoading && !photos.length ? <Empty description="Chưa có ảnh" /> : null}
      <PhotoGrid
        photos={photos}
        onOpen={setViewing}
        hasMore={Boolean(query.hasNextPage)}
        onLoadMore={() => void query.fetchNextPage()}
        loading={query.isFetchingNextPage}
        badge={statusBadge}
      />
      <PhotoViewer
        photos={photos}
        photoId={viewing}
        onClose={() => setViewing(null)}
        onSelect={setViewing}
      />
    </div>
  );
}
