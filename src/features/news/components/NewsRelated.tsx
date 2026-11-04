import { PictureOutlined } from '@ant-design/icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { newsDate } from './NewsArticle';
import { publishedNewsQuery } from './NewsList';

const RELATED_MAX = 5;

/** Cột "Bài mới khác" cạnh bài đang đọc; dùng chung cache với danh sách bài đã đăng. */
export function NewsRelated(props: { currentId: string; onOpen: (id: string) => void }) {
  const query = useInfiniteQuery(publishedNewsQuery);
  const others = (query.data?.pages[0]?.items ?? [])
    .filter((post) => post.id !== props.currentId)
    .slice(0, RELATED_MAX);

  if (!others.length) {
    return null;
  }
  return (
    <aside className="news-related">
      <h2>Bài mới khác</h2>
      {others.map((post) => (
        <button
          key={post.id}
          type="button"
          className="news-related-item"
          onClick={() => props.onOpen(post.id)}
        >
          <span className="news-related-cover">
            {post.cover ? <img src={post.cover.thumbUrl} alt="" loading="lazy" /> : <PictureOutlined />}
          </span>
          <span className="news-related-text">
            <strong>{post.title}</strong>
            <small>{newsDate(post.publishedAt)}</small>
          </span>
        </button>
      ))}
    </aside>
  );
}
