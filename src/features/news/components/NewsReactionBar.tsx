import { CommentOutlined, DownOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, Spin, Tooltip, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import { applyNewsReactions } from '@/lib/newsCache';
import type { NewsPost, NewsReactionKind } from '@/types';
import { NEWS_REACTIONS, isPostGone, reactionOf } from '../utils/news';

const NAMES_SHOWN = 15;

function ReactionNames({ postId }: { postId: string }) {
  const query = useQuery({
    queryKey: queryKeys.newsReactionUsers(postId),
    queryFn: () => api.newsReactionUsers(postId),
  });
  if (query.isLoading) {
    return <Spin size="small" />;
  }
  const items = query.data?.items ?? [];
  return (
    <div className="news-reaction-names">
      {items.slice(0, NAMES_SHOWN).map((item) => (
        <div key={item.user.id}>
          {reactionOf(item.kind).emoji} {item.user.name}
        </div>
      ))}
      {items.length > NAMES_SHOWN ? <div>và {items.length - NAMES_SHOWN} người khác</div> : null}
    </div>
  );
}

/** Mỗi người một cảm xúc: nút chính bật/tắt "Thích", bảng cảm xúc để đổi; chọn lại cảm xúc đang có là gỡ */
export function NewsReactionBar(props: { post: NewsPost; onComment: () => void }) {
  const queryClient = useQueryClient();
  const { id, reactions, commentCount } = props.post;
  const [pickerOpen, setPickerOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (kind: NewsReactionKind | null) =>
      kind ? api.setNewsReaction(id, kind) : api.removeNewsReaction(id),
    onSuccess: (summary) => applyNewsReactions(queryClient, id, summary),
    onError: (err) => {
      if (isPostGone(err)) {
        void message.error('Bài không còn tồn tại');
        void queryClient.invalidateQueries({ queryKey: queryKeys.newsPosts });
      } else {
        void message.error(errorText(err, 'Không thả được cảm xúc.'));
      }
    },
  });
  const mine = reactions.mine ? reactionOf(reactions.mine) : null;

  function choose(kind: NewsReactionKind) {
    setPickerOpen(false);
    mutation.mutate(kind === reactions.mine ? null : kind);
  }

  const picker = (
    <div className="news-reaction-picker">
      {NEWS_REACTIONS.map((item) => (
        <Tooltip key={item.kind} title={item.label}>
          <button
            type="button"
            className={`news-reaction-option${item.kind === reactions.mine ? ' active' : ''}`}
            aria-label={item.label}
            data-kind={item.kind}
            onClick={() => choose(item.kind)}
          >
            {item.emoji}
          </button>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <div className="news-reactions">
      {reactions.total || commentCount ? (
        <div className="news-reactions-summary">
          {reactions.total ? (
            // antd chỉ dựng nội dung tooltip ở lần mở đầu, nên danh sách tên chỉ tải khi rê chuột vào.
            // Không truyền title rỗng: tooltip không có title thì không bao giờ mở
            <Tooltip title={<ReactionNames postId={id} />}>
              <span className="news-reactions-total">
                <span className="news-reactions-emojis">
                  {reactions.top.map((kind) => (
                    <span key={kind}>{reactionOf(kind).emoji}</span>
                  ))}
                </span>
                {reactions.total}
              </span>
            </Tooltip>
          ) : (
            <span />
          )}
          {commentCount ? (
            <button type="button" className="news-link-button" onClick={props.onComment}>
              {commentCount} bình luận
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="news-reactions-actions">
        <Popover
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger="hover"
          mouseEnterDelay={0.4}
          placement="topLeft"
          content={picker}
        >
          <span className="news-reaction-main-group">
            <button
              type="button"
              className={`news-reaction-main${mine ? ' active' : ''}`}
              style={mine ? { color: mine.color } : undefined}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(reactions.mine ? null : 'like')}
            >
              <span className="news-reaction-main-emoji">{mine?.emoji ?? '👍'}</span>
              {mine?.label ?? 'Thích'}
            </button>
            {/* Màn cảm ứng không có hover, nên có nút riêng để mở bảng cảm xúc */}
            <button
              type="button"
              className="news-reaction-more"
              aria-label="Chọn cảm xúc"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <DownOutlined />
            </button>
          </span>
        </Popover>
        <button type="button" className="news-reaction-main" onClick={props.onComment}>
          <CommentOutlined /> Bình luận
        </button>
      </div>
    </div>
  );
}
