import { PlusOutlined, SmileOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useState } from 'react';
import { EMOJIS, QUICK_REACTIONS } from '../utils/emojis';

export function ReactionPicker(props: {
  disabled?: boolean;
  mine: string[];
  onPick: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (props.disabled) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setExpanded(false);
    }
  };

  const handlePick = (emoji: string) => {
    props.onPick(emoji);
    setOpen(false);
    setExpanded(false);
  };

  const content = (
    <div className="react-picker-panel" onClick={(e) => e.stopPropagation()}>
      <div className="react-picker">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`react-emoji-btn${props.mine.includes(emoji) ? ' picked' : ''}`}
            onClick={() => handlePick(emoji)}
          >
            {emoji}
          </button>
        ))}
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          className="react-expand-btn"
          aria-label="Thêm cảm xúc"
          onClick={() => setExpanded((prev) => !prev)}
        />
      </div>
      {expanded ? (
        <div className="react-grid">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`react-emoji-btn${props.mine.includes(emoji) ? ' picked' : ''}`}
              onClick={() => handlePick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
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
