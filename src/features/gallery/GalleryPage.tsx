import { UploadOutlined } from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import { useState } from 'react';
import { AlbumsTab } from './components/AlbumsTab';
import { MyPhotosTab } from './components/MyPhotosTab';
import { ReviewTab } from './components/ReviewTab';
import { SubmitPhotosModal } from './components/SubmitPhotosModal';
import { useGalleryAccess } from './hooks/useGalleryAccess';

export function GalleryPage() {
  const { canReview } = useGalleryAccess();
  const [tab, setTab] = useState('albums');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <h1>Thư viện ảnh</h1>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setSubmitting(true)}>
          Gửi ảnh
        </Button>
      </header>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'albums', label: 'Album', children: <AlbumsTab canReview={canReview} /> },
          { key: 'mine', label: 'Ảnh của tôi', children: <MyPhotosTab /> },
          ...(canReview ? [{ key: 'review', label: 'Duyệt ảnh', children: <ReviewTab /> }] : []),
        ]}
      />
      <SubmitPhotosModal
        open={submitting}
        onClose={() => setSubmitting(false)}
        onSent={() => setTab('mine')}
      />
    </div>
  );
}
