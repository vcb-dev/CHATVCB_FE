import { EditOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { P, can } from '@/lib/access';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { NewsComposer } from './components/NewsComposer';
import { NewsDraftList } from './components/NewsDraftList';
import { NewsFacebookPages } from './components/NewsFacebookPages';
import { NewsFeed } from './components/NewsFeed';
import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader } from '@/components/PageHeader';

/** BE chuyển về `?workspace=news&facebook=ok|error` sau khi kết nối; useWorkspace xóa query trong effect của trang cha, nên đọc ngay lúc render đầu */
function facebookReturn(): string | null {
  return new URLSearchParams(window.location.search).get('facebook');
}

type View = { name: 'feed' } | { name: 'drafts' } | { name: 'facebook' };

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
  /** Id bài đang mở trong hộp đăng bài; hộp nằm đè lên màn đang xem nên không cần đổi view */
  const [composing, setComposing] = useState<string | null>(null);

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

  const editPost = useCallback((id: string) => setComposing(id), []);

  async function writePost() {
    setCreating(true);
    try {
      const post = await api.createNewsPost();
      setComposing(post.id);
    } catch (err) {
      void message.error(errorText(err, 'Không tạo được bài.'));
    } finally {
      setCreating(false);
    }
  }

  // Lớp phủ của hộp đăng bài chặn cả màn, nên đổi mục không cần hỏi bỏ thay đổi
  const handleTabChange = (key: string) => {
    if (key === 'facebook') {
      setView({ name: 'facebook' });
    } else if (key === 'drafts') {
      setView({ name: 'drafts' });
    } else {
      setView({ name: 'feed' });
    }
  };

  // Người chỉ đọc chỉ có một mục, PageHeader tự ẩn hàng tab
  const header = (
    <PageHeader
      title="Bản tin"
      actions={
        canPublish ? (
          <Button
            type="primary"
            icon={<EditOutlined />}
            loading={creating}
            onClick={() => void writePost()}
          >
            Viết bài
          </Button>
        ) : undefined
      }
      tabs={{
        items: [
          { key: 'feed', label: 'Bảng tin' },
          ...(canPublish ? [{ key: 'drafts', label: 'Nháp' }] : []),
          ...(canFacebook ? [{ key: 'facebook', label: 'Page Facebook' }] : []),
        ],
        activeKey: view.name,
        onChange: handleTabChange,
      }}
    />
  );

  const composer = composing ? (
    <NewsComposer
      key={composing}
      postId={composing}
      onDirtyChange={onDirtyChange}
      onClose={() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
        setComposing(null);
      }}
      onPublished={() => {
        setComposing(null);
        setView({ name: 'feed' });
      }}
    />
  ) : null;

  if (view.name === 'facebook') {
    return (
      <>
        <ModuleLayout header={header}>
          <div className="news-column">
            <NewsFacebookPages />
          </div>
        </ModuleLayout>
        {composer}
      </>
    );
  }

  return (
    <>
      <ModuleLayout header={header}>
        {view.name === 'feed' ? (
          <NewsFeed me={user} canPublish={canPublish} onEdit={editPost} />
        ) : (
          <div className="news-column">
            <NewsDraftList onOpen={setComposing} />
          </div>
        )}
      </ModuleLayout>
      {composer}
    </>
  );
}
