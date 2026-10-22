import { SmileOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useState } from 'react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

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
