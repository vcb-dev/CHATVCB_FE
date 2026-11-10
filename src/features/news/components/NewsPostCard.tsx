import type { TextAreaRef } from 'antd/es/input/TextArea';
import { memo, useRef } from 'react';
import type { NewsFeedPost, User } from '@/types';
import { postAuthor } from '../utils/feed';
import { newsTime } from '../utils/news';
import { NewsComments } from './NewsComments';
import { NewsPostMenu } from './NewsPostMenu';
import { NewsPostView } from './NewsPostView';
import { NewsReactionBar } from './NewsReactionBar';

export const NewsPostCard = memo(function NewsPostCard(props: {
  post: NewsFeedPost;
  me: User;
  canPublish: boolean;
  onEdit: (id: string) => void;
}) {
  const { post, me, canPublish, onEdit } = props;
  const composerRef = useRef<TextAreaRef>(null);

  function focusComposer() {
    composerRef.current?.resizableTextArea?.textArea.scrollIntoView({ block: 'center', behavior: 'smooth' });
    composerRef.current?.focus({ cursor: 'end' });
  }

  const publishedAt = post.publishedAt ?? post.updatedAt;
  const timeLabel = newsTime(publishedAt);
  const timeTitle = new Date(publishedAt).toLocaleString('vi-VN');
  const hasMenu = Boolean(post.source || canPublish);

  return (
    <article className="news-post-card" data-feed-id={post.id}>
      <NewsPostView
        author={postAuthor(post)}
        timeLabel={timeLabel}
        timeTitle={timeTitle}
        title={post.title}
        blocks={post.blocks}
        images={post.images}
        cover={post.cover}
        menu={hasMenu ? <NewsPostMenu post={post} canPublish={canPublish} onEdit={onEdit} /> : undefined}
      />
      <section className="news-social">
        <NewsReactionBar post={post} onComment={focusComposer} />
        <NewsComments
          postId={post.id}
          me={me}
          canModerate={canPublish}
          composerRef={composerRef}
        />
      </section>
    </article>
  );
});

