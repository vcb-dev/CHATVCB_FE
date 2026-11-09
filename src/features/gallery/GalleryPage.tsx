import {
  AppstoreOutlined,
  CheckCircleOutlined,
  PictureOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { AlbumsTab } from './components/AlbumsTab';
import { MyPhotosTab } from './components/MyPhotosTab';
import { ReviewTab } from './components/ReviewTab';
import { SubmitPhotosModal } from './components/SubmitPhotosModal';
import { useGalleryAccess } from './hooks/useGalleryAccess';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';

export function GalleryPage() {
  const { canReview } = useGalleryAccess();
  const [tab, setTab] = useState('albums');
  const [submitting, setSubmitting] = useState(false);

  const sidebarGroups = [
    {
      items: [
        { key: 'albums', label: 'Album', icon: <AppstoreOutlined /> },
        { key: 'mine', label: 'Ảnh của tôi', icon: <PictureOutlined /> },
        ...(canReview ? [{ key: 'review', label: 'Duyệt ảnh', icon: <CheckCircleOutlined /> }] : []),
      ],
    },
  ];

  const sidebarAction = (
    <Button
      type="primary"
      block
      icon={<UploadOutlined />}
      onClick={() => setSubmitting(true)}
    >
      Gửi ảnh
    </Button>
  );

  const pageTitle = tab === 'albums' ? 'Album' : tab === 'mine' ? 'Ảnh của tôi' : 'Duyệt ảnh';

  return (
    <ModuleLayout
      sidebar={
        <ModuleSidebar
          title="Thư viện ảnh"
          action={sidebarAction}
          groups={sidebarGroups}
          activeKey={tab}
          onSelect={(key) => setTab(key)}
        />
      }
      header={<PageHeader title={pageTitle} />}
    >
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
    </ModuleLayout>
  );
}
