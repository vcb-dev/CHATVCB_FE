import type { CSSProperties, MouseEvent } from 'react';
import type { Task } from '@/types';
import { formatTime, type ItemMenuHandler } from '../utils/calendar';
import { CALENDAR_STATUS_LABEL, taskStatus } from '../utils/status';
import { PersonAvatar } from './PersonAvatar';
import { TaskStatusIcon } from './TaskStatusIcon';

/** Bấm mở chi tiết, chuột phải mở menu; chặn nổi bọt để không mở tạo việc của ô bên dưới. */
export function chipHandlers<T>(
  value: T,
  onOpen: (value: T, anchor: DOMRect) => void,
  onMenu?: (value: T, point: { x: number; y: number }, anchor: DOMRect) => void,
) {
  return {
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onOpen(value, event.currentTarget.getBoundingClientRect());
    },
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      if (onMenu) {
        event.preventDefault();
        event.stopPropagation();
        onMenu(
          value,
          { x: event.clientX, y: event.clientY },
          event.currentTarget.getBoundingClientRect(),
        );
      }
    },
  };
}

export function TaskChip(props: {
  task: Task;
  /** Thẻ hai dòng của lưới tuần; mặc định một dòng cho lịch tháng. */
  block?: boolean;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onMenu?: ItemMenuHandler;
  style?: CSSProperties;
}) {
  const { task, onMenu } = props;
  const status = taskStatus(task);
  const time = task.dueAt ? formatTime(task.dueAt) : null;
  const handlers = chipHandlers(
    task,
    props.onOpen,
    onMenu ? (value, point, anchor) => onMenu({ kind: 'task', task: value }, point, anchor) : undefined,
  );
  return (
    <button
      type="button"
      className={['task-chip', status, props.block ? 'block' : ''].filter(Boolean).join(' ')}
      title={[task.title, time, `Nhận: ${task.assignee.name}`, CALENDAR_STATUS_LABEL[status]]
        .filter(Boolean)
        .join(' · ')}
      style={props.style}
      {...handlers}
    >
      {props.block ? (
        <>
          <span className="task-chip-line">
            <TaskStatusIcon status={status} />
            {time ? <span className="task-chip-time">{time}</span> : null}
            <PersonAvatar person={task.assignee} size={14} />
            <span className="task-chip-person">{task.assignee.name}</span>
          </span>
          <span className="task-chip-title">{task.title}</span>
        </>
      ) : (
        <>
          <TaskStatusIcon status={status} />
          {time ? <span className="task-chip-time">{time}</span> : null}
          <span className="task-chip-title">{task.title}</span>
        </>
      )}
    </button>
  );
}
