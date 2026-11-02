import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import {
  confirmStopSeries,
  formatDue,
  isOverdue,
  seriesLabel,
  taskRoomLabel,
  taskRowActions,
  TASK_STATUS_LABEL,
} from '@/lib/tasks';
import type { PlannedTask, Task } from '@/types';
import { useTaskStatus } from '../hooks/useTaskStatus';

function PeekFrame(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="task-peek">
      <div className="task-peek-head">
        <strong className="task-peek-title">{props.title}</strong>
        <Button
          type="text"
          size="small"
          aria-label="Đóng"
          icon={<CloseOutlined />}
          onClick={props.onClose}
        />
      </div>
      {props.children}
    </div>
  );
}

export function TaskPeek(props: {
  task: Task;
  userId: string;
  onClose: () => void;
  onOpenInChat: (task: Task) => void;
}) {
  const { task, onClose } = props;
  const { busyId, changeStatus, confirmCancel } = useTaskStatus();
  const actions = taskRowActions(task, props.userId);
  const busy = busyId === task.id;
  const setStatus = async (status: 'done' | 'open') => {
    if (await changeStatus(task, status)) {
      onClose();
    }
  };
  return (
    <PeekFrame title={task.title} onClose={onClose}>
      <div className="task-detail">
        <span className={`task-status ${task.status}`}>{TASK_STATUS_LABEL[task.status]}</span>
        <dl>
          <dt>Nhóm</dt>
          <dd>{taskRoomLabel(task, props.userId)}</dd>
          <dt>Người giao</dt>
          <dd>{task.creator.name}</dd>
          <dt>Người nhận</dt>
          <dd>{task.assignee.name}</dd>
          {task.dueAt ? (
            <>
              <dt>Hạn</dt>
              <dd>
                {formatDue(task.dueAt)}
                {isOverdue(task) ? <span className="task-overdue">Quá hạn</span> : null}
              </dd>
            </>
          ) : null}
          {task.notes ? (
            <>
              <dt>Ghi chú</dt>
              <dd className="task-detail-notes">{task.notes}</dd>
            </>
          ) : null}
        </dl>
        {task.series ? <p className="task-series-label">{seriesLabel(task.series)}</p> : null}
        {task.recalled ? <p className="task-detail-recalled">Tin việc đã được thu hồi.</p> : null}
        <div className="task-detail-actions">
          {actions.canComplete ? (
            <Button
              size="small"
              type="primary"
              disabled={busy}
              onClick={() => void setStatus('done')}
            >
              Hoàn thành
            </Button>
          ) : null}
          {actions.canReopen ? (
            <Button size="small" disabled={busy} onClick={() => void setStatus('open')}>
              Mở lại
            </Button>
          ) : null}
          {actions.canCancel ? (
            <Button
              size="small"
              danger
              disabled={busy}
              onClick={() => {
                onClose();
                confirmCancel(task);
              }}
            >
              Hủy việc
            </Button>
          ) : null}
          {task.series && !task.series.stopped && actions.canEdit ? (
            <Button
              size="small"
              onClick={() => {
                onClose();
                confirmStopSeries(task.series?.id as string);
              }}
            >
              Dừng lặp
            </Button>
          ) : null}
          <Button size="small" onClick={() => props.onOpenInChat(task)}>
            Mở trong chat
          </Button>
        </div>
      </div>
    </PeekFrame>
  );
}

export function PlannedPeek(props: {
  planned: PlannedTask;
  userId: string;
  onClose: () => void;
  onStopped: () => void;
}) {
  const { planned, onClose } = props;
  return (
    <PeekFrame title={planned.title} onClose={onClose}>
      <div className="task-detail task-planned-detail">
        <span className="task-status">Dự kiến</span>
        <dl>
          <dt>Nhóm</dt>
          <dd>{taskRoomLabel(planned, props.userId)}</dd>
          <dt>Người giao</dt>
          <dd>{planned.creator.name}</dd>
          <dt>Người nhận</dt>
          <dd>{planned.assignee.name}</dd>
          <dt>Hạn</dt>
          <dd>{formatDue(planned.dueAt)}</dd>
          {planned.endsAt ? (
            <>
              <dt>Kết thúc</dt>
              <dd>{new Date(planned.endsAt).toLocaleDateString('vi-VN')}</dd>
            </>
          ) : null}
        </dl>
        <p className="task-series-label">
          {seriesLabel({
            id: planned.seriesId,
            frequency: planned.frequency,
            endsAt: planned.endsAt,
            stopped: false,
          })}
        </p>
        <p className="task-detail-recalled">Việc sẽ được tạo khi tới kỳ.</p>
        {planned.creator.id === props.userId ? (
          <div className="task-detail-actions">
            <Button
              size="small"
              onClick={() => {
                onClose();
                confirmStopSeries(planned.seriesId, props.onStopped);
              }}
            >
              Dừng lặp
            </Button>
          </div>
        ) : null}
      </div>
    </PeekFrame>
  );
}
