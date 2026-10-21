import { useState } from 'react';
import { Button, Popover, Tooltip } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import type { MessageReaction } from './types';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

export function ReactionPicker(props: {
  disabled?: boolean;
  onPick: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (props.disabled) {
    return null;
  }

  const content = (
    <div className="react-picker" onClick={(e) => e.stopPropagation()}>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="react-emoji-btn"
          onClick={() => {
            props.onPick(emoji);
            setOpen(false);
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="top"
      overlayClassName="react-popover"
    >
      <Button
        type="text"
        size="small"
        icon={<SmileOutlined />}
        className="react-trigger"
        onClick={(e) => e.stopPropagation()}
        aria-label="Thả cảm xúc"
      />
    </Popover>
  );
}

export function ReactionSummary(props: {
  reactions: MessageReaction[];
  myId: string;
  onToggle: (emoji: string) => void;
}) {
  const activeReactions = props.reactions.filter((r) => r.count > 0);
  if (activeReactions.length === 0) {
    return null;
  }

  return (
    <div className="react-summary">
      {activeReactions.map((r) => {
        const isMine = r.userIds.includes(props.myId);
        const names = r.users.map((u) => u.name).join(', ') || `${r.count} người`;
        return (
          <Tooltip title={names} key={r.emoji}>
            <button
              type="button"
              className={`react-pill ${isMine ? 'mine' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                props.onToggle(r.emoji);
              }}
            >
              <span className="react-pill-emoji">{r.emoji}</span>
              <span className="react-pill-count">{r.count}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
