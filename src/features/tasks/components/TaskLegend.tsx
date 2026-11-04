import { TASK_STATUS_LABEL } from '@/lib/tasks';
import { TaskStatusIcon, type CalendarStatus } from './TaskStatusIcon';

const ITEMS: { status: CalendarStatus; label: string }[] = [
  { status: 'open', label: TASK_STATUS_LABEL.open },
  { status: 'overdue', label: 'Quá hạn' },
  { status: 'done', label: TASK_STATUS_LABEL.done },
  { status: 'cancelled', label: TASK_STATUS_LABEL.cancelled },
  { status: 'planned', label: 'Dự kiến' },
];

export function TaskLegend() {
  return (
    <div className="task-legend">
      {ITEMS.map(({ status, label }) => (
        <span key={status} className={`task-legend-item ${status}`}>
          <TaskStatusIcon status={status} />
          {label}
        </span>
      ))}
    </div>
  );
}
