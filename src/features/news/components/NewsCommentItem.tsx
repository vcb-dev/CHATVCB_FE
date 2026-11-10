import { Avatar, Popconfirm, message } from 'antd';
import { api } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import { errorText } from '@/lib/errors';
import type { NewsComment, User } from '@/types';
import { newsTime } from '../utils/news';
import { NewsCommentComposer } from './NewsCommentComposer';
import { NewsText } from './NewsText';

export function NewsCommentItem(props: {
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
  const replies = comment.replyCount;

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
          <NewsCommentComposer
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

