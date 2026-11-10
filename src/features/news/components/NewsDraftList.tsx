import { PictureOutlined } from '@ant-design/icons';
import { Button, Empty, Spin } from 'antd';
import { useMemo } from 'react';
import { errorText } from '@/lib/errors';
import { useNewsDrafts } from '../hooks/useNewsDrafts';
import { newsDateTime } from '../utils/news';

export function NewsDraftList(props: { onOpen: (id: string) => void }) {
  const query = useNewsDrafts();
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
    return <Empty description="Chưa có nháp" />;
  }
  return (
    <div className="news-draft-list">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className="news-draft-row"
          onClick={() => props.onOpen(post.id)}
        >
          <span className="news-draft-cover">
            {post.cover ? <img src={post.cover.thumbUrl} alt="" loading="lazy" /> : <PictureOutlined />}
          </span>
          <span className="news-draft-text">
            <strong>{post.title || '(Chưa có tiêu đề)'}</strong>
            <small>Sửa lúc {newsDateTime(post.updatedAt)}</small>
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

