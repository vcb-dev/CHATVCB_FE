import { PictureOutlined } from '@ant-design/icons';
import { Button, Empty, Spin } from 'antd';
import { useMemo } from 'react';
import { errorText } from '@/lib/errors';
import { useNewsList } from '../hooks/useNewsList';
import { newsDate } from '../utils/news';

export function NewsList(props: {
  kind: 'published' | 'drafts';
  onOpen: (id: string) => void;
}) {
  const drafts = props.kind === 'drafts';
  const query = useNewsList(props.kind);
  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  if (query.isLoading) {
    return <Spin className="news-loading" />;
  }
  if (query.isError) {
    return (
      <div className="news-state">
        <p>{errorText(query.error, 'Không tải được bản tin.')}</p>
        <Button onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  }
  if (!posts.length) {
    return <Empty description={drafts ? 'Chưa có nháp' : 'Chưa có bản tin'} />;
  }
  return (
    <div className="news-list">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className="news-card"
          onClick={() => props.onOpen(post.id)}
        >
          <span className="news-card-cover">
            {post.cover ? <img src={post.cover.thumbUrl} alt="" loading="lazy" /> : <PictureOutlined />}
          </span>
          <span className="news-card-text">
            <strong>{post.title || '(Chưa có tiêu đề)'}</strong>
            <small>
              {post.author?.name ?? 'Người dùng cũ'} · {newsDate(post.publishedAt)}
            </small>
            {post.excerpt ? <span className="news-card-excerpt">{post.excerpt}</span> : null}
          </span>
        </button>
      ))}
      {query.hasNextPage ? (
        <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Xem thêm
        </Button>
      ) : null}
    </div>
  );
}
