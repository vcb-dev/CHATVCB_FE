import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Modal, message } from 'antd';
import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { GalleryAlbum } from '@/types';
import { AlbumFormModal } from './AlbumFormModal';
import { PhotoGrid } from './PhotoGrid';
import { PhotoViewer } from './PhotoViewer';

const NO_ALBUM = 'none';

function AlbumPhotos(props: { albumId: string; name: string; onBack: () => void }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: queryKeys.galleryPhotos(props.albumId),
    queryFn: ({ pageParam }) => api.galleryPhotos({ albumId: props.albumId, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const photos = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  return (
    <div className="gallery-album-view">
      <div className="gallery-album-bar">
        <Button className="gallery-back" icon={<ArrowLeftOutlined />} onClick={props.onBack}>
          Quay lại
        </Button>
        <h2>{props.name}</h2>
      </div>
      {!query.isLoading && !photos.length ? <Empty description="Chưa có ảnh" /> : null}
      <PhotoGrid
        photos={photos}
        onOpen={setViewing}
        hasMore={Boolean(query.hasNextPage)}
        onLoadMore={() => void query.fetchNextPage()}
        loading={query.isFetchingNextPage}
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

export function AlbumsTab({ canReview }: { canReview: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<{ album: GalleryAlbum | null } | null>(null);
  const { data: albums = [] } = useQuery({
    queryKey: queryKeys.galleryAlbums,
    queryFn: () => api.galleryAlbums(),
  });

  if (open) {
    return <AlbumPhotos albumId={open.id} name={open.name} onBack={() => setOpen(null)} />;
  }

  function askDelete(album: GalleryAlbum) {
    Modal.confirm({
      title: `Xóa album "${album.name}"?`,
      content: 'Ảnh trong album không bị xóa, sẽ chuyển sang "Chưa xếp album".',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await api.deleteGalleryAlbum(album.id);
          await queryClient.invalidateQueries({ queryKey: queryKeys.galleryLibrary });
        } catch (err) {
          message.error(errorText(err, 'Không xóa được album.'));
        }
      },
    });
  }

  const shown = canReview ? albums : albums.filter((album) => album.photoCount > 0);

  return (
    <div>
      {canReview ? (
        <div className="gallery-album-bar">
          <Button icon={<PlusOutlined />} onClick={() => setEditing({ album: null })}>
            Tạo album
          </Button>
        </div>
      ) : null}
      <div className="gallery-grid-albums">
        {shown.map((album) => (
          <div key={album.id} className="gallery-album-card">
            <button
              type="button"
              className="gallery-album-open"
              onClick={() => setOpen({ id: album.id, name: album.name })}
            >
              <span className="gallery-album-cover">
                {album.coverUrl ? <img src={album.coverUrl} alt="" loading="lazy" /> : <PictureOutlined />}
              </span>
              <strong>{album.name}</strong>
              <small>{album.photoCount} ảnh</small>
            </button>
            {canReview ? (
              <span className="gallery-album-tools">
                <Button
                  className="gallery-album-edit"
                  size="small"
                  icon={<EditOutlined />}
                  aria-label="Sửa album"
                  onClick={() => setEditing({ album })}
                />
                <Button
                  className="gallery-album-delete"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Xóa album"
                  onClick={() => askDelete(album)}
                />
              </span>
            ) : null}
          </div>
        ))}
        <div className="gallery-album-card">
          <button
            type="button"
            className="gallery-album-open"
            onClick={() => setOpen({ id: NO_ALBUM, name: 'Chưa xếp album' })}
          >
            <span className="gallery-album-cover">
              <InboxOutlined />
            </span>
            <strong>Chưa xếp album</strong>
          </button>
        </div>
      </div>
      {canReview ? (
        <AlbumFormModal
          open={Boolean(editing)}
          album={editing?.album ?? null}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
