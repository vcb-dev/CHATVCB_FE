import type { CSSProperties } from 'react';
import { avatarColor } from '@/lib/avatar';
import type { PlannedTask } from '@/types';
import { formatTime } from '../utils/calendar';
import { TaskStatusIcon } from './TaskStatusIcon';

export function PlannedChip(props: {
  planned: PlannedTask;
  onOpen: (planned: PlannedTask, anchor: DOMRect) => void;
  style?: CSSProperties;
}) {
  const { planned } = props;
  const time = formatTime(planned.dueAt);
  return (
    <button
      type="button"
      className="task-chip planned"
      title={`${planned.title} · ${time} · ${planned.assignee.name} · Dự kiến`}
      style={{ ...props.style, borderLeftColor: avatarColor(planned.roomId) }}
      onClick={(event) => {
        event.stopPropagation();
        props.onOpen(planned, event.currentTarget.getBoundingClientRect());
      }}
    >
      <TaskStatusIcon status="planned" />
      <span className="task-chip-time">{time}</span>
      <span className="task-chip-title">{planned.title}</span>
    </button>
  );
}
