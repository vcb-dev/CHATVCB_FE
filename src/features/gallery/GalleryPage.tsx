import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { AlbumFormModal } from './components/AlbumFormModal';
import { AlbumsTab } from './components/AlbumsTab';
import { MyPhotosTab } from './components/MyPhotosTab';
import { ReviewTab } from './components/ReviewTab';
import { SubmitPhotosModal } from './components/SubmitPhotosModal';
import { useGalleryAccess } from './hooks/useGalleryAccess';
import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader } from '@/components/PageHeader';

export function GalleryPage() {
  const { canReview } = useGalleryAccess();
  const [tab, setTab] = useState('albums');
  const [submitting, setSubmitting] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const tabs = {
    items: [
      { key: 'albums', label: 'Album' },
      { key: 'mine', label: 'Ảnh của tôi' },
      ...(canReview ? [{ key: 'review', label: 'Duyệt ảnh' }] : []),
    ],
    activeKey: tab,
    onChange: setTab,
  };

  const actions = (
    <>
      {tab === 'albums' && canReview ? (
        <Button icon={<PlusOutlined />} onClick={() => setCreatingAlbum(true)}>
          Tạo album
        </Button>
      ) : null}
      <Button type="primary" icon={<UploadOutlined />} onClick={() => setSubmitting(true)}>
        Gửi ảnh
      </Button>
    </>
  );

  return (
    <ModuleLayout header={<PageHeader title="Thư viện ảnh" tabs={tabs} actions={actions} />}>
      {tab === 'albums' ? (
        <AlbumsTab canReview={canReview} />
      ) : tab === 'mine' ? (
        <MyPhotosTab />
      ) : (
        <ReviewTab />
      )}

      <SubmitPhotosModal
        open={submitting}
        onClose={() => setSubmitting(false)}
        onSent={() => setTab('mine')}
      />
      {canReview ? (
        <AlbumFormModal
          open={creatingAlbum}
          album={null}
          onClose={() => setCreatingAlbum(false)}
        />
      ) : null}
    </ModuleLayout>
  );
}
