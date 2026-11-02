import { CheckSquareOutlined } from '@ant-design/icons';
import { Button, Modal, message as antMessage } from 'antd';
import { useState, type SyntheticEvent } from 'react';
import { api } from '@/api/client';
import { errorText } from '@/lib/errors';
import {
  confirmStopSeries,
  formatDue,
  isOverdue,
  seriesLabel,
  taskActions,
  TASK_STATUS_LABEL,
} from '@/lib/tasks';
import type { ChatMessage, MessageTask, TaskStatus } from '@/types';
import { TaskModal } from './TaskModal';

function stop(event: SyntheticEvent) {
  event.stopPropagation();
}

export function TaskCard({ message, userId }: { message: ChatMessage; userId: string }) {
  const task = message.task as MessageTask;
  const [busy, setBusy] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const actions = taskActions(task, userId);
  const canStopSeries = Boolean(task.series && !task.series.stopped && actions.canEdit);

  const changeStatus = async (status: TaskStatus) => {
    setBusy(status);
    try {
      await api.updateTask(task.id, { status });
    } catch (err) {
      antMessage.error(errorText(err, 'Không cập nhật được việc.'));
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = () => {
    Modal.confirm({
      title: 'Hủy việc này?',
      content: 'Cả người giao và người nhận sẽ thấy việc đã hủy.',
      okText: 'Hủy việc',
      cancelText: 'Không',
      okButtonProps: { danger: true },
      onOk: () => changeStatus('cancelled'),
    });
  };

  return (
    <div className={`task-card ${task.status}`} onClick={stop}>
      <div className="task-card-head">
        <span className="task-card-kind">
          <CheckSquareOutlined /> Việc
        </span>
        <span className={`task-status ${task.status}`}>{TASK_STATUS_LABEL[task.status]}</span>
      </div>
      <strong className="task-card-title">{task.title}</strong>
      <div className="task-card-meta">
        <span>Người nhận: {task.assigneeName}</span>
        <span>Người giao: {task.creatorName}</span>
        {task.dueAt ? (
          <span>
            Hạn: {formatDue(task.dueAt)}
            {isOverdue(task) ? <span className="task-overdue">Quá hạn</span> : null}
          </span>
        ) : null}
      </div>
      {task.series ? <span className="task-series-label">{seriesLabel(task.series)}</span> : null}
      {task.notes ? <p className="task-card-notes">{task.notes}</p> : null}
      {actions.canComplete || actions.canReopen || actions.canCancel || actions.canEdit ? (
        <div className="task-card-actions">
          {actions.canComplete ? (
            <Button
              size="small"
              type="primary"
              loading={busy === 'done'}
              onClick={() => void changeStatus('done')}
            >
              Hoàn thành
            </Button>
          ) : null}
          {actions.canReopen ? (
            <Button size="small" loading={busy === 'open'} onClick={() => void changeStatus('open')}>
              Mở lại
            </Button>
          ) : null}
          {actions.canCancel ? (
            <Button size="small" danger loading={busy === 'cancelled'} onClick={confirmCancel}>
              Hủy việc
            </Button>
          ) : null}
          {actions.canEdit ? (
            <Button size="small" onClick={() => setEditing(true)}>
              Sửa
            </Button>
          ) : null}
          {canStopSeries ? (
            <Button size="small" onClick={() => confirmStopSeries(task.series?.id as string)}>
              Dừng lặp
            </Button>
          ) : null}
        </div>
      ) : null}
      {editing ? (
        // Portal của modal vẫn nổi bọt qua cây React: chặn lại để không mở menu chuột phải của tin
        <span onClick={stop} onContextMenu={stop}>
          <TaskModal
            open
            roomId={message.roomId}
            members={[]}
            currentUserId={userId}
            isDirect={false}
            task={task}
            onClose={() => setEditing(false)}
          />
        </span>
      ) : null}
    </div>
  );
}
