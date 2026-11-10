import { EditOutlined, FacebookFilled, FileTextOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { P, can } from '@/lib/access';
import { confirmDiscard } from '@/lib/confirmDiscard';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { NewsEditor } from './components/NewsEditor';
import { NewsFacebookPages } from './components/NewsFacebookPages';
import { NewsFeed } from './components/NewsFeed';
import { NewsList } from './components/NewsList';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';

/** BE chuyển về `?workspace=news&facebook=ok|error` sau khi kết nối; useWorkspace xóa query trong effect của trang cha, nên đọc ngay lúc render đầu */
function facebookReturn(): string | null {
  return new URLSearchParams(window.location.search).get('facebook');
}

type View = { name: 'list' } | { name: 'editor'; id: string; back: { name: 'list' } } | { name: 'facebook' };

export function NewsPage({
  user,
  onDirtyChange,
}: {
  user: User;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const canPublish = can(user, P.news.publish);
  const canFacebook = can(user, P.news.facebook);
  const [view, setView] = useState<View>(() =>
    canFacebook && facebookReturn() ? { name: 'facebook' } : { name: 'list' },
  );
  const [tab, setTab] = useState('published');
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleDirtyChange = (d: boolean) => {
    setDirty(d);
    onDirtyChange(d);
  };

  useEffect(() => {
    void api
      .markNewsSeen()
      .then(() => {
        queryClient.setQueryData(queryKeys.newsUnread, { count: 0 });
        // Hủy cả lần đếm đang chạy dở, kẻo nó trả về số cũ sau khi đã về 0
        return queryClient.invalidateQueries({ queryKey: queryKeys.newsUnread });
      })
      .catch(() => undefined);
  }, [queryClient]);

  useEffect(() => {
    const result = facebookReturn();
    if (result === 'ok') {
      const pages = Number(new URLSearchParams(window.location.search).get('pages') ?? 0);
      void message.success({
        key: 'facebook-connect',
        content: pages ? `Đã kết nối ${pages} Page. Bật "Tự đăng" cho Page muốn dùng.` : 'Tài khoản này không quản lý Page nào.',
      });
    } else if (result === 'error') {
      void message.error({ key: 'facebook-connect', content: 'Không kết nối được Facebook. Thử lại.' });
    }
  }, []);

  const editPost = useCallback((id: string) => {
    setView({ name: 'editor', id, back: { name: 'list' } });
  }, []);

  async function writePost() {
    setCreating(true);
    try {
      const post = await api.createNewsPost();
      setView({ name: 'editor', id: post.id, back: { name: 'list' } });
    } catch (err) {
      void message.error(errorText(err, 'Không tạo được bài.'));
    } finally {
      setCreating(false);
    }
  }

  const handleSidebarSelect = (key: string) => {
    const proceed = () => {
      if (key === 'facebook') {
        setView({ name: 'facebook' });
      } else {
        setView({ name: 'list' });
        setTab(key);
      }
    };

    if (view.name === 'editor' && dirty) {
      confirmDiscard(proceed);
      return;
    }
    proceed();
  };

  const sidebarGroups = [
    {
      items: [
        { key: 'published', label: 'Đã đăng', icon: <FileTextOutlined /> },
        ...(canPublish ? [{ key: 'drafts', label: 'Nháp', icon: <EditOutlined /> }] : []),
        ...(canFacebook ? [{ key: 'facebook', label: 'Page Facebook', icon: <FacebookFilled /> }] : []),
      ],
    },
  ];

  const sidebarAction = canPublish ? (
    <Button
      type="primary"
      block
      icon={<EditOutlined />}
      loading={creating}
      onClick={() => void writePost()}
    >
      Viết bài
    </Button>
  ) : undefined;

  const activeKey = view.name === 'facebook' ? 'facebook' : tab;

  if (view.name === 'editor') {
    return (
      <ModuleLayout
        flush
        sidebar={
          <ModuleSidebar
            title="Bản tin"
            action={sidebarAction}
            groups={sidebarGroups}
            activeKey="drafts"
            onSelect={handleSidebarSelect}
          />
        }
      >
        <NewsEditor
          key={view.id}
          postId={view.id}
          onDirtyChange={handleDirtyChange}
          onClose={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
            setView(view.back);
          }}
          onPublished={() => {
            setTab('published');
            setView({ name: 'list' });
          }}
        />
      </ModuleLayout>
    );
  }

  if (view.name === 'facebook') {
    return (
      <ModuleLayout
        sidebar={
          <ModuleSidebar
            title="Bản tin"
            action={sidebarAction}
            groups={sidebarGroups}
            activeKey="facebook"
            onSelect={handleSidebarSelect}
          />
        }
        header={<PageHeader title="Page Facebook" onBack={() => setView({ name: 'list' })} />}
      >
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <NewsFacebookPages onBack={() => setView({ name: 'list' })} />
        </div>
      </ModuleLayout>
    );
  }

  const pageTitle = tab === 'published' ? 'Đã đăng' : 'Nháp';

  return (
    <ModuleLayout
      sidebar={
        <ModuleSidebar
          title="Bản tin"
          action={sidebarAction}
          groups={sidebarGroups}
          activeKey={activeKey}
          onSelect={handleSidebarSelect}
        />
      }
      header={<PageHeader title={pageTitle} />}
    >
      {tab === 'published' ? (
        <NewsFeed me={user} canPublish={canPublish} onEdit={editPost} />
      ) : (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <NewsList
            onOpen={(id) => {
              setView({ name: 'editor', id, back: { name: 'list' } });
            }}
          />
        </div>
      )}
    </ModuleLayout>
  );
}
