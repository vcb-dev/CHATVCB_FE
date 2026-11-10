import { FacebookFilled } from '@ant-design/icons';
import { Avatar } from 'antd';
import { type ReactNode, useMemo } from 'react';
import { avatarColor, initials } from '@/lib/avatar';
import type { NewsBlock, NewsImage } from '@/types';
import { feedImages, type NewsPostAuthor } from '../utils/feed';
import { NewsImageGrid } from './NewsImageGrid';
import { NewsPostText } from './NewsPostText';

export function NewsPostView(props: {
  author: NewsPostAuthor;
  timeLabel: string;
  timeTitle?: string;
  title: string;
  blocks: NewsBlock[];
  images: NewsImage[];
  cover: NewsImage | null;
  menu?: ReactNode;
}) {
  const { author, timeLabel, timeTitle, title, blocks, images, cover, menu } = props;

  const fImages = useMemo(
    () => feedImages({ cover, blocks, images }),
    [cover, blocks, images],
  );

  return (
    <article className="news-post-view">
      <div className="news-post-head">
        <div className="news-post-head-left">
          {author.facebookUrl ? (
            <Avatar
              size={40}
              className="news-post-fb-avatar"
              icon={<FacebookFilled />}
            />
          ) : (
            <Avatar
              size={40}
              src={author.avatarUrl || undefined}
              style={{ backgroundColor: avatarColor(author.name) }}
            >
              {initials(author.name)}
            </Avatar>
          )}
          <div className="news-post-meta">
            <div className="news-post-author">{author.name}</div>
            <div className="news-post-time" title={timeTitle}>
              {timeLabel}
              {author.facebookUrl ? (
                <>
                  {' · '}
                  <a
                    href={author.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Facebook
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {menu ? <div className="news-post-menu">{menu}</div> : null}
      </div>

      <NewsPostText title={title} blocks={blocks} />

      {fImages.length > 0 ? <NewsImageGrid images={fImages} /> : null}
    </article>
  );
}
