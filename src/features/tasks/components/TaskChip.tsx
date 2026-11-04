import type { CSSProperties } from 'react';
import { avatarColor } from '@/lib/avatar';
import { isOverdue, TASK_STATUS_LABEL } from '@/lib/tasks';
import type { Task } from '@/types';
import { formatTime } from '../utils/calendar';
import { TaskStatusIcon } from './TaskStatusIcon';

export function TaskChip(props: {
  task: Task;
  onOpen: (task: Task, anchor: DOMRect) => void;
  style?: CSSProperties;
}) {
  const { task } = props;
  const overdue = isOverdue(task);
  const statusLabel = overdue ? 'Quá hạn' : TASK_STATUS_LABEL[task.status];
  const time = task.dueAt ? formatTime(task.dueAt) : null;
  return (
    <button
      type="button"
      className={['task-chip', task.status, overdue ? 'overdue' : ''].filter(Boolean).join(' ')}
      title={[task.title, time, task.assignee.name, statusLabel].filter(Boolean).join(' · ')}
      style={{ ...props.style, borderLeftColor: avatarColor(task.roomId) }}
      onClick={(event) => {
        event.stopPropagation();
        props.onOpen(task, event.currentTarget.getBoundingClientRect());
      }}
    >
      <TaskStatusIcon status={overdue ? 'overdue' : task.status} />
      {time ? <span className="task-chip-time">{time}</span> : null}
      <span className="task-chip-title">{task.title}</span>
    </button>
  );
}
