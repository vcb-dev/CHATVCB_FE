import type { CSSProperties } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import type { PlannedTask } from '@/types';
import { formatTime, type ItemMenuHandler } from '../utils/calendar';
import { chipHandlers } from './TaskChip';
import { TaskStatusIcon } from './TaskStatusIcon';

export function PlannedChip(props: {
  planned: PlannedTask;
  block?: boolean;
  onOpen: (planned: PlannedTask, anchor: DOMRect) => void;
  onMenu?: ItemMenuHandler;
  style?: CSSProperties;
}) {
  const { planned, onMenu } = props;
  const time = formatTime(planned.dueAt);
  const handlers = chipHandlers(
    planned,
    props.onOpen,
    onMenu
      ? (value, point, anchor) => onMenu({ kind: 'planned', planned: value }, point, anchor)
      : undefined,
  );
  return (
    <button
      type="button"
      className={props.block ? 'task-chip planned block' : 'task-chip planned'}
      title={`${planned.title} · ${time} · Nhận: ${planned.assignee.name} · Dự kiến`}
      style={props.style}
      {...handlers}
    >
      {props.block ? (
        <>
          <span className="task-chip-line">
            <TaskStatusIcon status="planned" />
            <span className="task-chip-time">{time}</span>
            <UserAvatar
              size={14}
              gap={1}
              className="task-person-avatar"
              src={planned.assignee.avatarUrl}
              name={planned.assignee.name}
              zoomable={false}
            />
            <span className="task-chip-person">{planned.assignee.name}</span>
          </span>
          <span className="task-chip-title">{planned.title}</span>
        </>
      ) : (
        <>
          <TaskStatusIcon status="planned" />
          <span className="task-chip-time">{time}</span>
          <span className="task-chip-title">{planned.title}</span>
        </>
      )}
    </button>
  );
}
