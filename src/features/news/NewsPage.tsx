import { ArrowLeftOutlined, EditOutlined, FacebookFilled, FileTextOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Spin, message } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { P, can } from '@/lib/access';
import { confirmDiscard } from '@/lib/confirmDiscard';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { NewsArticle } from './components/NewsArticle';
import { NewsComments } from './components/NewsComments';
import { NewsEditor } from './components/NewsEditor';
import { NewsFacebookPages } from './components/NewsFacebookPages';
import { NewsList } from './components/NewsList';
import { NewsReactionBar } from './components/NewsReactionBar';
import { NewsRelated } from './components/NewsRelated';
import { ModuleLayout } from '@/components/ModuleLayout';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { PageHeader } from '@/components/PageHeader';

/** BE chuyển về `?workspace=news&facebook=ok|error` sau khi kết nối; useWorkspace xóa query trong effect của trang cha, nên đọc ngay lúc render đầu */
function facebookReturn(): string | null {
  return new URLSearchParams(window.location.search).get('facebook');
}

function ArticleView(props: {
  id: string;
  user: User;
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
  const composerRef = useRef<TextAreaRef>(null);

  function focusComposer() {
    composerRef.current?.resizableTextArea?.textArea.scrollIntoView({ block: 'center', behavior: 'smooth' });
    composerRef.current?.focus({ cursor: 'end' });
  }

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
          <div className="news-reader-main">
            <NewsArticle
              title={post.title}
              blocks={post.blocks}
              images={post.images}
              cover={post.cover}
              author={post.author}
              source={post.source}
              publishedAt={post.publishedAt}
            />
            {/* Nháp chưa có ai đọc, cảm xúc và bình luận chỉ mở trên bài đã đăng */}
            {post.status === 'published' ? (
              <section className="news-social">
                <NewsReactionBar post={post} onComment={focusComposer} />
                <NewsComments
                  postId={post.id}
                  me={props.user}
                  canModerate={props.canPublish}
                  composerRef={composerRef}
                />
              </section>
            ) : null}
          </div>
          <NewsRelated currentId={post.id} onOpen={props.onOpenOther} />
        </div>
      ) : null}
    </div>
  );
}

type ReadView = { name: 'list' } | { name: 'article'; id: string };
type View = ReadView | { name: 'editor'; id: string; back: ReadView } | { name: 'facebook' };

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
          onPublished={(post) => {
            setTab('published');
            setView({ name: 'article', id: post.id });
          }}
        />
      </ModuleLayout>
    );
  }

  if (view.name === 'article') {
    return (
      <ModuleLayout
        flush
        sidebar={
          <ModuleSidebar
            title="Bản tin"
            action={sidebarAction}
            groups={sidebarGroups}
            activeKey={tab}
            onSelect={handleSidebarSelect}
          />
        }
      >
        <ArticleView
          id={view.id}
          user={user}
          canPublish={canPublish}
          onBack={() => setView({ name: 'list' })}
          onEdit={(id) => setView({ name: 'editor', id, back: { name: 'article', id } })}
          onOpenOther={openArticle}
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
      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <NewsList
          kind={tab === 'drafts' ? 'drafts' : 'published'}
          onOpen={(id) => {
            if (tab === 'drafts') {
              setView({ name: 'editor', id, back: { name: 'list' } });
            } else {
              openArticle(id);
            }
          }}
        />
      </div>
    </ModuleLayout>
  );
}
