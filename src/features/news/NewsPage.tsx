import { EditOutlined, FacebookFilled, ReadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { P, can } from '@/lib/access';
import { confirmDiscard } from '@/lib/confirmDiscard';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { NewsDraftList } from './components/NewsDraftList';
import { NewsEditor } from './components/NewsEditor';
import { NewsFacebookPages } from './components/NewsFacebookPages';
import { NewsFeed } from './components/NewsFeed';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';

/** BE chuyển về `?workspace=news&facebook=ok|error` sau khi kết nối; useWorkspace xóa query trong effect của trang cha, nên đọc ngay lúc render đầu */
function facebookReturn(): string | null {
  return new URLSearchParams(window.location.search).get('facebook');
}

type View =
  | { name: 'feed' }
  | { name: 'drafts' }
  | { name: 'facebook' }
  | { name: 'editor'; id: string; back: 'feed' | 'drafts' };

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
    canFacebook && facebookReturn() ? { name: 'facebook' } : { name: 'feed' },
  );
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleDirtyChange = useCallback(
    (d: boolean) => {
      setDirty(d);
      onDirtyChange(d);
    },
    [onDirtyChange],
  );

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

  function guard(action: () => void) {
    if (view.name === 'editor' && dirty) {
      confirmDiscard(action);
      return;
    }
    action();
  }

  const editPost = useCallback((id: string) => {
    setView({ name: 'editor', id, back: 'feed' });
  }, []);

  async function writePost(back: 'feed' | 'drafts') {
    setCreating(true);
    try {
      const post = await api.createNewsPost();
      setView({ name: 'editor', id: post.id, back });
    } catch (err) {
      void message.error(errorText(err, 'Không tạo được bài.'));
    } finally {
      setCreating(false);
    }
  }

  const handleSidebarSelect = (key: string) => {
    guard(() => {
      if (key === 'facebook') {
        setView({ name: 'facebook' });
      } else if (key === 'drafts') {
        setView({ name: 'drafts' });
      } else {
        setView({ name: 'feed' });
      }
    });
  };

  const sidebarGroups = [
    {
      items: [
        { key: 'feed', label: 'Bảng tin', icon: <ReadOutlined /> },
        ...(canPublish ? [{ key: 'drafts', label: 'Nháp', icon: <EditOutlined /> }] : []),
        ...(canFacebook ? [{ key: 'facebook', label: 'Page Facebook', icon: <FacebookFilled /> }] : []),
      ],
    },
  ];

  const currentBack: 'feed' | 'drafts' =
    view.name === 'editor' ? view.back : view.name === 'drafts' ? 'drafts' : 'feed';

  const sidebarAction = canPublish ? (
    <Button
      type="primary"
      block
      icon={<EditOutlined />}
      loading={creating}
      onClick={() => guard(() => void writePost(currentBack))}
    >
      Viết bài
    </Button>
  ) : undefined;

  const activeKey = view.name === 'editor' ? view.back : view.name;

  if (view.name === 'editor') {
    return (
      <ModuleLayout
        flush
        sidebar={
          <ModuleSidebar
            title="Bản tin"
            action={sidebarAction}
            groups={sidebarGroups}
            activeKey={activeKey}
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
            setView(view.back === 'drafts' ? { name: 'drafts' } : { name: 'feed' });
          }}
          onPublished={() => {
            setView({ name: 'feed' });
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
            activeKey={activeKey}
            onSelect={handleSidebarSelect}
          />
        }
      >
        <div className="news-column">
          <NewsFacebookPages />
        </div>
      </ModuleLayout>
    );
  }

  const pageTitle = view.name === 'drafts' ? 'Nháp' : 'Bảng tin';

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
      {view.name === 'feed' ? (
        <NewsFeed me={user} canPublish={canPublish} onEdit={editPost} />
      ) : (
        <div className="news-column">
          <NewsDraftList
            onOpen={(id) => {
              setView({ name: 'editor', id, back: 'drafts' });
            }}
          />
        </div>
      )}
    </ModuleLayout>
  );
}
