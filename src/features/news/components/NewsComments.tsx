import { SendOutlined } from '@ant-design/icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Input, Popconfirm, Spin, message } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { type Ref, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import { errorText } from '@/lib/errors';
import type { NewsComment, User } from '@/types';
import { NEWS_COMMENT_MAX, newsTime } from '../utils/news';
import { NewsText } from './NewsArticle';

function CommentComposer(props: {
  placeholder: string;
  initial?: string;
  submitText?: string;
  autoFocus?: boolean;
  inputRef?: Ref<TextAreaRef>;
  onSubmit: (body: string) => Promise<unknown>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  const [sending, setSending] = useState(false);
  const empty = !value.trim();

  async function submit() {
    if (empty || sending) {
      return;
    }
    setSending(true);
    try {
      await props.onSubmit(value);
      setValue('');
      props.onDone();
    } catch (err) {
      void message.error(errorText(err, 'Không gửi được bình luận.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="news-comment-composer">
      <Input.TextArea
        ref={props.inputRef}
        value={value}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        autoSize={{ minRows: 1, maxRows: 6 }}
        maxLength={NEWS_COMMENT_MAX}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Đang gõ dấu tiếng Việt bằng bộ gõ thì Enter là chốt chữ, không phải gửi
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') {
            props.onCancel?.();
          }
        }}
      />
      <span className="news-comment-composer-actions">
        {props.onCancel ? (
          <Button size="small" onClick={props.onCancel}>
            Hủy
          </Button>
        ) : null}
        <Button
          size="small"
          type="primary"
          icon={props.submitText ? undefined : <SendOutlined />}
          aria-label={props.submitText ?? 'Gửi bình luận'}
          disabled={empty}
          loading={sending}
          onClick={() => void submit()}
        >
          {props.submitText}
        </Button>
      </span>
    </div>
  );
}

function CommentItem(props: {
  comment: NewsComment;
  me: User;
  canModerate: boolean;
  editing: boolean;
  onReply: () => void;
  onEdit: (editing: boolean) => void;
  onChanged: () => void;
}) {
  const { comment, me } = props;
  const name = comment.author?.name ?? 'Người dùng cũ';
  const mine = comment.author?.id === me.id;
  const replies = comment.replies.length;

  async function remove() {
    try {
      await api.deleteNewsComment(comment.id);
      props.onChanged();
    } catch (err) {
      void message.error(errorText(err, 'Không xóa được bình luận.'));
    }
  }

  return (
    <div className="news-comment" data-comment-id={comment.id}>
      <Avatar
        size={32}
        src={comment.author?.avatarUrl || undefined}
        style={{ backgroundColor: avatarColor(name), flex: 'none' }}
      >
        {initials(name)}
      </Avatar>
      <div className="news-comment-main">
        {props.editing ? (
          <CommentComposer
            placeholder="Sửa bình luận…"
            initial={comment.body}
            submitText="Lưu"
            autoFocus
            onSubmit={(body) => api.updateNewsComment(comment.id, body)}
            onDone={() => {
              props.onEdit(false);
              props.onChanged();
            }}
            onCancel={() => props.onEdit(false)}
          />
        ) : (
          <div className="news-comment-bubble">
            <strong>{name}</strong>
            <div className="news-comment-body">
              <NewsText text={comment.body} />
            </div>
          </div>
        )}
        <div className="news-comment-meta">
          <span title={new Date(comment.createdAt).toLocaleString('vi-VN')}>{newsTime(comment.createdAt)}</span>
          <button type="button" className="news-link-button" onClick={props.onReply}>
            Trả lời
          </button>
          {mine && !props.editing ? (
            <button type="button" className="news-link-button" onClick={() => props.onEdit(true)}>
              Sửa
            </button>
          ) : null}
          {mine || props.canModerate ? (
            <Popconfirm
              title={replies ? `Xóa bình luận này và ${replies} trả lời?` : 'Xóa bình luận này?'}
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
              onConfirm={remove}
            >
              <button type="button" className="news-link-button">
                Xóa
              </button>
            </Popconfirm>
          ) : null}
          {comment.editedAt ? <span>Đã sửa</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Trang bình luận gốc về theo thứ tự mới nhất trước, hiện đảo lại để bình luận cũ ở trên như Facebook */
export function NewsComments(props: {
  postId: string;
  me: User;
  canModerate: boolean;
  composerRef: Ref<TextAreaRef>;
}) {
  const queryClient = useQueryClient();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: queryKeys.newsComments(props.postId),
    queryFn: ({ pageParam }) => api.newsComments(props.postId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const roots = useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).slice().reverse(),
    [query.data],
  );

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.newsComments(props.postId) });
  }

  function item(comment: NewsComment, rootId: string) {
    return (
      <CommentItem
        key={comment.id}
        comment={comment}
        me={props.me}
        canModerate={props.canModerate}
        editing={editing === comment.id}
        onReply={() => setReplyTo(rootId)}
        onEdit={(on) => setEditing(on ? comment.id : null)}
        onChanged={refresh}
      />
    );
  }

  return (
    <section className="news-comments">
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
          <button type="button" className="news-link-button" onClick={() => void query.refetch()}>
            Thử lại
          </button>
        </div>
      ) : null}
      {roots.map((root) => (
        <div key={root.id} className="news-comment-thread">
          {item(root, root.id)}
          {root.replies.length || replyTo === root.id ? (
            <div className="news-comment-replies">
              {root.replies.map((reply) => item(reply, root.id))}
              {replyTo === root.id ? (
                <CommentComposer
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
      <CommentComposer
        inputRef={props.composerRef}
        placeholder="Viết bình luận…"
        onSubmit={(body) => api.createNewsComment(props.postId, body)}
        onDone={refresh}
      />
    </section>
  );
}
