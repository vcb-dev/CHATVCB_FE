import { Tooltip } from 'antd';
import type { MessageReaction } from '@/types';

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
