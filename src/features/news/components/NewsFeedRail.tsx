import { PictureOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import type { NewsFeedPost, NewsImage } from '@/types';
import { feedImages } from '../utils/feed';
import { newsTime } from '../utils/news';

/** Cột phải dính khi cuộn, nên giữ đủ ngắn để vừa màn 1366×768 */
const RECENT_MAX = 5;
const PHOTOS_MAX = 6;

/** Cột phải của bảng tin: lối tắt tới bài và ảnh, lấy từ các bài đã tải nên không gọi thêm API */
export function NewsFeedRail(props: { posts: NewsFeedPost[]; onJump: (postId: string) => void }) {
  const { posts, onJump } = props;
  const recent = useMemo(
    () => posts.slice(0, RECENT_MAX).map((post) => ({ post, thumb: feedImages(post)[0]?.image ?? null })),
    [posts],
  );
  const photos = useMemo(() => {
    const items: { post: NewsFeedPost; image: NewsImage }[] = [];
    for (const post of posts) {
      for (const { image } of feedImages(post)) {
        if (items.length === PHOTOS_MAX) {
          return items;
        }
        items.push({ post, image });
      }
    }
    return items;
  }, [posts]);

  if (!recent.length) {
    return null;
  }
  return (
    <aside className="news-feed-rail">
      <section className="news-rail-card">
        <h3 className="news-rail-title">Bài gần đây</h3>
        {recent.map(({ post, thumb }) => (
          <button key={post.id} type="button" className="news-rail-post" onClick={() => onJump(post.id)}>
            <span className="news-rail-thumb">
              {thumb ? <img src={thumb.thumbUrl} alt="" loading="lazy" /> : <PictureOutlined />}
            </span>
            <span className="news-rail-post-text">
              <strong>{post.title}</strong>
              <small>
                {newsTime(post.publishedAt ?? post.updatedAt)}
                {post.commentCount ? ` · ${post.commentCount} bình luận` : ''}
              </small>
            </span>
          </button>
        ))}
      </section>
      {photos.length ? (
        <section className="news-rail-card">
          <h3 className="news-rail-title">Ảnh trong Bản tin</h3>
          <div className="news-rail-photos">
            {photos.map(({ post, image }) => (
              <button
                key={image.id}
                type="button"
                className="news-rail-photo"
                aria-label={`Mở bài ${post.title}`}
                onClick={() => onJump(post.id)}
              >
                <img src={image.thumbUrl} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
