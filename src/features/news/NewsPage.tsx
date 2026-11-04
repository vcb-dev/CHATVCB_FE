import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Spin, Tabs, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { P, can } from '@/lib/access';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { NewsArticle } from './components/NewsArticle';
import { NewsEditor } from './components/NewsEditor';
import { NewsList } from './components/NewsList';
import { NewsRelated } from './components/NewsRelated';

function ArticleView(props: {
  id: string;
  canPublish: boolean;
  onBack: () => void;
  onEdit: (id: string) => void;
  onOpenOther: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.newsPost(props.id),
    queryFn: () => api.newsPost(props.id),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  const post = query.data;

  function confirmAction(title: string, okText: string, danger: boolean, action: () => Promise<unknown>) {
    Modal.confirm({
      title,
      okText,
      okButtonProps: { danger },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await action();
          queryClient.removeQueries({ queryKey: queryKeys.newsPost(props.id) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
          props.onBack();
        } catch (err) {
          message.error(errorText(err, 'Không thực hiện được.'));
        }
      },
    });
  }

  return (
    <div className="news-reader">
      <div className="news-reader-bar">
        <Button icon={<ArrowLeftOutlined />} onClick={props.onBack}>
          Quay lại
        </Button>
        {post && !query.isError && props.canPublish ? (
          <span className="news-reader-actions">
            <Button icon={<EditOutlined />} onClick={() => props.onEdit(post.id)}>
              Sửa
            </Button>
            {post.status === 'published' ? (
              <Button
                onClick={() =>
                  confirmAction('Gỡ bài này về nháp?', 'Gỡ', false, () =>
                    api.unpublishNewsPost(post.id),
                  )
                }
              >
                Gỡ về nháp
              </Button>
            ) : null}
            <Button
              danger
              onClick={() =>
                confirmAction('Xóa hẳn bài này?', 'Xóa', true, () => api.deleteNewsPost(post.id))
              }
            >
              Xóa
            </Button>
          </span>
        ) : null}
      </div>
      {query.isLoading ? <Spin className="news-loading" /> : null}
      {query.isError ? (
        <div className="news-state">
          <p>
            {query.error instanceof ApiError && query.error.status === 404
              ? 'Bài không còn tồn tại'
              : errorText(query.error, 'Không tải được bài.')}
          </p>
        </div>
      ) : null}
      {post && !query.isError ? (
        <div className="news-reader-layout">
          <NewsArticle
            title={post.title}
            blocks={post.blocks}
            images={post.images}
            cover={post.cover}
            author={post.author}
            publishedAt={post.publishedAt}
          />
          <NewsRelated currentId={post.id} onOpen={props.onOpenOther} />
        </div>
      ) : null}
    </div>
  );
}

type ReadView = { name: 'list' } | { name: 'article'; id: string };
type View = ReadView | { name: 'editor'; id: string; back: ReadView };

export function NewsPage({
  user,
  onDirtyChange,
}: {
  user: User;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const canPublish = can(user, P.news.publish);
  const [view, setView] = useState<View>({ name: 'list' });
  const [tab, setTab] = useState('published');
  const [creating, setCreating] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Mở bài khác từ cột bên phải thì đọc từ đầu bài, không giữ vị trí cuộn của bài trước
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
  }, [view]);

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

  function openArticle(id: string) {
    setView({ name: 'article', id });
  }

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

  if (view.name === 'editor') {
    return (
      <div className="news-page">
        <NewsEditor
          key={view.id}
          postId={view.id}
          onDirtyChange={onDirtyChange}
          onClose={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.newsLibrary });
            setView(view.back);
          }}
          onPublished={(post) => {
            setTab('published');
            setView({ name: 'article', id: post.id });
          }}
        />
      </div>
    );
  }

  if (view.name === 'article') {
    return (
      <div className="news-page" ref={pageRef}>
        <ArticleView
          id={view.id}
          canPublish={canPublish}
          onBack={() => setView({ name: 'list' })}
          onEdit={(id) => setView({ name: 'editor', id, back: { name: 'article', id } })}
          onOpenOther={openArticle}
        />
      </div>
    );
  }

  return (
    <div className="news-page">
      <header className="news-header">
        <h1>Bản tin</h1>
        {canPublish ? (
          <Button type="primary" loading={creating} onClick={() => void writePost()}>
            Viết bài
          </Button>
        ) : null}
      </header>
      {canPublish ? (
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'published', label: 'Đã đăng', children: <NewsList kind="published" onOpen={openArticle} /> },
            {
              key: 'drafts',
              label: 'Nháp',
              children: (
                <NewsList
                  kind="drafts"
                  onOpen={(id) => setView({ name: 'editor', id, back: { name: 'list' } })}
                />
              ),
            },
          ]}
        />
      ) : (
        <NewsList kind="published" onOpen={openArticle} />
      )}
    </div>
  );
}
