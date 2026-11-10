import { Button, Empty, Spin } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { errorText } from '@/lib/errors';
import type { User } from '@/types';
import { useNewsFeed } from '../hooks/useNewsFeed';
import { NewsPostCard } from './NewsPostCard';

export function NewsFeed(props: {
  me: User;
  canPublish: boolean;
  onEdit: (id: string) => void;
}) {
  const query = useNewsFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const body = sentinel?.closest('.ui-module-body') ?? document.querySelector('.ui-module-body');
    if (body) {
      body.scrollTop = 0;
    }
  }, []);

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = sentinel.closest('.ui-module-body');
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
          void fetchNextPage();
        }
      },
      {
        root,
        rootMargin: '0px 0px 600px 0px',
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const posts = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  if (query.isLoading) {
    return <Spin className="news-loading" />;
  }

  if (query.isError && !isFetchNextPageError) {
    return (
      <div className="news-state">
        <p>{errorText(query.error, 'Không tải được bản tin.')}</p>
        <Button onClick={() => void query.refetch()}>Thử lại</Button>
      </div>
    );
  }

  if (!posts.length) {
    return <Empty description="Chưa có bản tin" />;
  }

  return (
    <div className="news-column">
      {posts.map((post) => (
        <NewsPostCard
          key={post.id}
          post={post}
          me={props.me}
          canPublish={props.canPublish}
          onEdit={props.onEdit}
        />
      ))}
      {isFetchNextPageError ? (
        <div className="news-feed-error">
          Không tải thêm được.{' '}
          <button
            type="button"
            className="news-link-button"
            onClick={() => void fetchNextPage()}
          >
            Thử lại
          </button>
        </div>
      ) : null}
      <div ref={sentinelRef} style={{ height: 1, width: '100%', pointerEvents: 'none' }} />
    </div>
  );
}
