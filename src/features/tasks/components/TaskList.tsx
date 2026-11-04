import { Button, Typography } from 'antd';
import { formatDue, isOverdue, taskRoomLabel, taskRowActions, TASK_STATUS_LABEL } from '@/lib/tasks';
import type { Task, TaskStatus } from '@/types';
import { useTaskStatus } from '../hooks/useTaskStatus';

const GROUPS: TaskStatus[] = ['open', 'done', 'cancelled'];

export function TaskList(props: {
  tasks: Task[];
  userId: string;
  onOpenTask: (task: Task) => void;
}) {
  const { busyId, changeStatus, confirmCancel } = useTaskStatus();

  const renderRow = (task: Task) => {
    const actions = taskRowActions(task, props.userId);
    const busy = busyId === task.id;
    return (
      <div key={task.id} className="tasks-page-row" onClick={() => props.onOpenTask(task)}>
        <div className="tasks-page-row-main">
          <strong className={task.status === 'cancelled' ? 'cancelled' : undefined}>{task.title}</strong>
          <small>
            {taskRoomLabel(task, props.userId)} · {task.creator.name} → {task.assignee.name}
          </small>
          {task.dueAt ? (
            <small>
              Hạn: {formatDue(task.dueAt)}
              {isOverdue(task) ? <span className="task-overdue">Quá hạn</span> : null}
            </small>
          ) : null}
        </div>
        <div className="tasks-page-row-actions" onClick={(e) => e.stopPropagation()}>
          {actions.canComplete ? (
            <Button
              size="small"
              type="primary"
              disabled={busy}
              onClick={() => void changeStatus(task, 'done')}
            >
              Hoàn thành
            </Button>
          ) : null}
          {actions.canReopen ? (
            <Button size="small" disabled={busy} onClick={() => void changeStatus(task, 'open')}>
              Mở lại
            </Button>
          ) : null}
          {actions.canCancel ? (
            <Button size="small" danger disabled={busy} onClick={() => confirmCancel(task)}>
              Hủy việc
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  if (props.tasks.length === 0) {
    return <Typography.Text type="secondary">Chưa có việc nào.</Typography.Text>;
  }
  return (
    <div className="tasks-page-list">
      {GROUPS.map((status) => {
        const rows = props.tasks.filter((task) => task.status === status);
        if (rows.length === 0) {
          return null;
        }
        return (
          <section key={status} className="tasks-page-group">
            <h3>
              {TASK_STATUS_LABEL[status]} ({rows.length})
            </h3>
            {rows.map(renderRow)}
          </section>
        );
      })}
    </div>
  );
}
