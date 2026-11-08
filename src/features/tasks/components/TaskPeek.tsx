import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  MessageOutlined,
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Input, Tooltip, message } from 'antd';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { copyText } from '@/lib/clipboard';
import {
  confirmStopSeries,
  formatDue,
  seriesLabel,
  taskRoomLabel,
  taskRowActions,
} from '@/lib/tasks';
import type { PlannedTask, Task, TaskPerson } from '@/types';
import { useTaskStatus } from '../hooks/useTaskStatus';
import { quickDue, relativeDue, toLocalValue, type QuickDue } from '../utils/calendar';
import { CALENDAR_STATUS_LABEL, taskStatus, type CalendarStatus } from '../utils/status';
import { canMoveDue } from './TaskContextMenu';
import { PersonAvatar } from './PersonAvatar';
import { TaskStatusIcon } from './TaskStatusIcon';

const QUICK_DUES: { kind: QuickDue; label: string }[] = [
  { kind: 'hour', label: '+1 giờ' },
  { kind: 'tomorrow', label: 'Ngày mai' },
  { kind: 'week', label: 'Tuần sau' },
];

/** Esc trong ô sửa chỉ thoát sửa, không đóng cả khung (khung nghe Esc ở document). */
function editKeys(onSave: () => void, onCancel: () => void, saveOnEnter: boolean) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    } else if (event.key === 'Enter' && (saveOnEnter || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSave();
    }
  };
}

function PeekHead(props: {
  status: CalendarStatus;
  series?: string;
  onClose: () => void;
}) {
  return (
    <div className="task-peek-head">
      <div className="task-peek-tags">
        <span className={`task-status ${props.status}`}>
          <TaskStatusIcon status={props.status} />
          {CALENDAR_STATUS_LABEL[props.status]}
        </span>
        {props.series ? (
          <span className="task-peek-tag">
            <SyncOutlined />
            {props.series}
          </span>
        ) : null}
      </div>
      <Button type="text" size="small" aria-label="Đóng" icon={<CloseOutlined />} onClick={props.onClose} />
    </div>
  );
}

function Row(props: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="task-peek-row">
      <span className="task-peek-row-icon">{props.icon}</span>
      <span className="task-peek-row-label">{props.label}</span>
      <div className="task-peek-row-value">{props.children}</div>
    </div>
  );
}

function Person(props: { person: TaskPerson; userId: string }) {
  return (
    <span className="task-person">
      <PersonAvatar person={props.person} size={20} />
      <span>
        {props.person.name}
        {props.person.id === props.userId ? <small> (bạn)</small> : null}
      </span>
    </span>
  );
}

function DueValue(props: { dueAt: string; status: CalendarStatus }) {
  const live = props.status === 'open' || props.status === 'overdue' || props.status === 'planned';
  return (
    <>
      {formatDue(props.dueAt)}
      {live ? (
        <span className={props.status === 'overdue' ? 'task-relative overdue' : 'task-relative'}>
          {relativeDue(props.dueAt, new Date())}
        </span>
      ) : null}
    </>
  );
}

function summary(task: Task, userId: string) {
  return [
    task.title,
    task.dueAt ? `Hạn: ${formatDue(task.dueAt)}` : null,
    `Nhóm: ${taskRoomLabel(task, userId)}`,
    `Người giao: ${task.creator.name}`,
    `Người nhận: ${task.assignee.name}`,
    task.notes ? `Ghi chú: ${task.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function TaskPeek(props: {
  task: Task;
  userId: string;
  editDue?: boolean;
  onClose: () => void;
  onOpenInChat: (task: Task) => void;
}) {
  const { task, onClose, userId } = props;
  const { busyId, changeStatus, patchTask, moveDue, confirmCancel } = useTaskStatus();
  const actions = taskRowActions(task, userId);
  const canEdit = actions.canEdit && !task.recalled;
  const canMove = canMoveDue(task, userId);
  const status = taskStatus(task);
  const busy = busyId === task.id;
  const [editing, setEditing] = useState<'title' | 'notes' | 'due' | null>(
    props.editDue && canMove ? 'due' : null,
  );
  // Esc gỡ ô sửa khỏi trang; trình duyệt có thể bắn blur lúc đó và không được lưu nhầm
  const cancelledTitle = useRef(false);
  const [draft, setDraft] = useState(() =>
    props.editDue ? toLocalValue(task.dueAt ? new Date(task.dueAt) : new Date()) : '',
  );

  const startEdit = (field: 'title' | 'notes' | 'due') => {
    cancelledTitle.current = false;
    setEditing(field);
    setDraft(
      field === 'title'
        ? task.title
        : field === 'notes'
          ? task.notes
          : toLocalValue(task.dueAt ? new Date(task.dueAt) : new Date()),
    );
  };
  const stopEdit = () => setEditing(null);

  const saveText = async (field: 'title' | 'notes') => {
    const value = draft.trim();
    if (field === 'title' && !value) {
      message.error('Tiêu đề không được để trống.');
      return;
    }
    if (value === task[field]) {
      stopEdit();
      return;
    }
    if (await patchTask(task, { [field]: value }, 'Đã cập nhật việc.')) {
      stopEdit();
    }
  };

  const saveDue = async () => {
    if (draft && (await moveDue(task, new Date(draft)))) {
      // Thẻ đã chạy sang ô khác: khung neo ở chỗ cũ không còn đúng chỗ
      onClose();
    }
  };

  const setStatus = async (next: 'done' | 'open') => {
    if (await changeStatus(task, next)) {
      onClose();
    }
  };

  const canStop = Boolean(task.series && !task.series.stopped && actions.canEdit);

  return (
    <div className="task-peek">
      <PeekHead
        status={status}
        series={task.series ? seriesLabel(task.series) : undefined}
        onClose={onClose}
      />
      {editing === 'title' ? (
        <Input
          autoFocus
          className="task-peek-title-input"
          maxLength={200}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={editKeys(
            () => void saveText('title'),
            () => {
              cancelledTitle.current = true;
              stopEdit();
            },
            true,
          )}
          onBlur={() => {
            if (cancelledTitle.current) {
              cancelledTitle.current = false;
            } else {
              void saveText('title');
            }
          }}
        />
      ) : canEdit ? (
        <button
          type="button"
          className="task-peek-title editable"
          title="Bấm để sửa tiêu đề"
          onClick={() => startEdit('title')}
        >
          {task.title}
          <EditOutlined />
        </button>
      ) : (
        <strong className="task-peek-title">{task.title}</strong>
      )}

      <div className="task-peek-rows">
        <Row icon={<ClockCircleOutlined />} label="Hạn">
          {editing === 'due' ? (
            <div className="task-peek-due-edit">
              <Input
                autoFocus
                size="small"
                type="datetime-local"
                className="task-peek-due-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={editKeys(() => void saveDue(), stopEdit, true)}
              />
              {task.dueAt ? (
                <div className="task-peek-due-quick">
                  {QUICK_DUES.map(({ kind, label }) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() =>
                        setDraft(toLocalValue(quickDue(task.dueAt as string, kind, new Date())))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="task-peek-edit-actions">
                <Button size="small" onClick={stopEdit}>
                  Hủy
                </Button>
                <Button size="small" type="primary" loading={busy} onClick={() => void saveDue()}>
                  Lưu hạn
                </Button>
              </div>
            </div>
          ) : (
            <>
              {task.dueAt ? <DueValue dueAt={task.dueAt} status={status} /> : 'Chưa có hạn'}
              {canMove ? (
                <button type="button" className="task-peek-link" onClick={() => startEdit('due')}>
                  {task.dueAt ? 'Đổi' : 'Đặt hạn'}
                </button>
              ) : null}
            </>
          )}
        </Row>
        <Row icon={<UserOutlined />} label="Người giao">
          <Person person={task.creator} userId={userId} />
        </Row>
        <Row icon={<UserOutlined />} label="Người nhận">
          <Person person={task.assignee} userId={userId} />
        </Row>
        <Row icon={<TeamOutlined />} label="Nhóm">
          {taskRoomLabel(task, userId)}
        </Row>
        <Row icon={<CalendarOutlined />} label="Tạo lúc">
          {formatDue(task.createdAt)}
        </Row>
        <Row icon={<FileTextOutlined />} label="Ghi chú">
          {editing === 'notes' ? (
            <div className="task-peek-notes-edit">
              <Input.TextArea
                autoFocus
                autoSize={{ minRows: 2, maxRows: 6 }}
                maxLength={2000}
                value={draft}
                placeholder="Thêm ghi chú cho việc này"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={editKeys(() => void saveText('notes'), stopEdit, false)}
              />
              <div className="task-peek-edit-actions">
                <Button size="small" onClick={stopEdit}>
                  Hủy
                </Button>
                <Button
                  size="small"
                  type="primary"
                  loading={busy}
                  onClick={() => void saveText('notes')}
                >
                  Lưu
                </Button>
              </div>
            </div>
          ) : task.notes ? (
            <span className="task-detail-notes">
              {task.notes}
              {canEdit ? (
                <button type="button" className="task-peek-link" onClick={() => startEdit('notes')}>
                  Sửa
                </button>
              ) : null}
            </span>
          ) : canEdit ? (
            <button type="button" className="task-peek-link" onClick={() => startEdit('notes')}>
              Thêm ghi chú
            </button>
          ) : (
            <span className="task-peek-muted">Không có</span>
          )}
        </Row>
      </div>

      {task.recalled ? <p className="task-detail-recalled">Tin việc đã được thu hồi, việc chỉ còn để xem.</p> : null}

      <div className="task-peek-actions">
        {actions.canComplete ? (
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            className="task-peek-done"
            disabled={busy}
            onClick={() => void setStatus('done')}
          >
            Hoàn thành
          </Button>
        ) : null}
        {actions.canReopen ? (
          <Button size="small" icon={<UndoOutlined />} disabled={busy} onClick={() => void setStatus('open')}>
            Mở lại
          </Button>
        ) : null}
        <Button size="small" icon={<MessageOutlined />} onClick={() => props.onOpenInChat(task)}>
          Mở trong chat
        </Button>
        <span className="task-peek-actions-gap" />
        <Tooltip title="Sao chép nội dung việc">
          <Button
            size="small"
            type="text"
            aria-label="Sao chép"
            icon={<CopyOutlined />}
            onClick={() =>
              void copyText(summary(task, userId)).then(
                () => message.success('Đã sao chép nội dung việc.'),
                () => message.error('Không sao chép được.'),
              )
            }
          />
        </Tooltip>
        {canStop ? (
          <Tooltip title="Dừng lặp">
            <Button
              size="small"
              type="text"
              aria-label="Dừng lặp"
              icon={<StopOutlined />}
              onClick={() => {
                onClose();
                confirmStopSeries(task.series?.id as string);
              }}
            />
          </Tooltip>
        ) : null}
        {actions.canCancel ? (
          <Tooltip title="Hủy việc">
            <Button
              size="small"
              type="text"
              danger
              aria-label="Hủy việc"
              icon={<CloseCircleOutlined />}
              disabled={busy}
              onClick={() => {
                onClose();
                confirmCancel(task);
              }}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

export function PlannedPeek(props: {
  planned: PlannedTask;
  userId: string;
  onClose: () => void;
  onStopped: () => void;
}) {
  const { planned, onClose, userId } = props;
  const series = seriesLabel({
    id: planned.seriesId,
    frequency: planned.frequency,
    endsAt: planned.endsAt,
    stopped: false,
  });
  return (
    <div className="task-peek">
      <PeekHead status="planned" series={series} onClose={onClose} />
      <strong className="task-peek-title">{planned.title}</strong>
      <div className="task-peek-rows">
        <Row icon={<ClockCircleOutlined />} label="Hạn">
          <DueValue dueAt={planned.dueAt} status="planned" />
        </Row>
        <Row icon={<UserOutlined />} label="Người giao">
          <Person person={planned.creator} userId={userId} />
        </Row>
        <Row icon={<UserOutlined />} label="Người nhận">
          <Person person={planned.assignee} userId={userId} />
        </Row>
        <Row icon={<TeamOutlined />} label="Nhóm">
          {taskRoomLabel(planned, userId)}
        </Row>
        {planned.endsAt ? (
          <Row icon={<CalendarOutlined />} label="Kết thúc">
            {new Date(planned.endsAt).toLocaleDateString('vi-VN')}
          </Row>
        ) : null}
      </div>
      <p className="task-detail-recalled">Việc sẽ được tạo và gửi vào nhóm khi tới kỳ.</p>
      {planned.creator.id === userId ? (
        <div className="task-peek-actions">
          <Button
            size="small"
            icon={<StopOutlined />}
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
  );
}
