import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Spin } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { type Ref, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import { errorText } from '@/lib/errors';
import { refreshNewsCommentPreview } from '@/lib/newsCache';
import type { NewsComment, NewsCommentPage, User } from '@/types';
import { NewsCommentComposer } from './NewsCommentComposer';
import { NewsCommentItem } from './NewsCommentItem';

/** Trang bình luận gốc về theo thứ tự mới nhất trước, hiện đảo lại để bình luận cũ ở trên như Facebook */
export function NewsComments(props: {
  postId: string;
  me: User;
  canModerate: boolean;
  composerRef: Ref<TextAreaRef>;
  preview: NewsCommentPage;
}) {
  const queryClient = useQueryClient();
  const [full, setFull] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: queryKeys.newsComments(props.postId),
    queryFn: ({ pageParam }) => api.newsComments(props.postId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: full,
  });

  const roots = useMemo(() => {
    if (full && query.data) {
      return query.data.pages.flatMap((page) => page.items).slice().reverse();
    }
    return props.preview.items.slice().reverse();
  }, [full, props.preview.items, query.data]);

  function refresh() {
    void refreshNewsCommentPreview(queryClient, props.postId).catch(() => undefined);
    if (full) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.newsComments(props.postId) });
    }
  }

  function item(comment: NewsComment, rootId: string) {
    return (
      <NewsCommentItem
        key={comment.id}
        comment={comment}
        me={props.me}
        canModerate={props.canModerate}
        editing={editing === comment.id}
        onReply={() => {
          setFull(true);
          setReplyTo(rootId);
        }}
        onEdit={(on) => setEditing(on ? comment.id : null)}
        onChanged={refresh}
      />
    );
  }

  return (
    <section className="news-comments">
      {!full ? (
        props.preview.nextCursor ? (
          <button
            type="button"
            className="news-link-button news-comments-more"
            onClick={() => setFull(true)}
          >
            Xem thêm bình luận
          </button>
        ) : null
      ) : (
        <>
          {query.hasNextPage ? (
            <button
              type="button"
              className="news-link-button news-comments-more"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'Đang tải…' : 'Xem bình luận trước'}
            </button>
          ) : null}
          {query.isLoading ? <Spin size="small" /> : null}
          {query.isError ? (
            <div className="news-comments-error">
              {errorText(query.error, 'Không tải được bình luận.')}{' '}
              <button
                type="button"
                className="news-link-button"
                onClick={() => void query.refetch()}
              >
                Thử lại
              </button>
            </div>
          ) : null}
        </>
      )}

      {roots.map((root) => (
        <div key={root.id} className="news-comment-thread">
          {item(root, root.id)}
          {!full && root.replyCount > 0 ? (
            <div className="news-comment-replies-more">
              <button
                type="button"
                className="news-link-button"
                onClick={() => setFull(true)}
              >
                Xem {root.replyCount} trả lời
              </button>
            </div>
          ) : null}
          {full && (root.replies.length || replyTo === root.id) ? (
            <div className="news-comment-replies">
              {root.replies.map((reply) => item(reply, root.id))}
              {replyTo === root.id ? (
                <NewsCommentComposer
                  placeholder={`Trả lời ${root.author?.name ?? ''}…`}
                  autoFocus
                  onSubmit={(body) => api.createNewsComment(props.postId, body, root.id)}
                  onDone={() => {
                    setReplyTo(null);
                    refresh();
                  }}
                  onCancel={() => setReplyTo(null)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ))}

      <div className="news-comment-new">
        <Avatar
          size={32}
          src={props.me.avatarUrl || undefined}
          style={{ backgroundColor: avatarColor(props.me.name), flex: 'none' }}
        >
          {initials(props.me.name)}
        </Avatar>
        <NewsCommentComposer
          inputRef={props.composerRef}
          placeholder="Viết bình luận…"
          onSubmit={(body) => api.createNewsComment(props.postId, body)}
          onDone={refresh}
          onGone={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.newsPosts });
          }}
        />
      </div>
    </section>
  );
}
