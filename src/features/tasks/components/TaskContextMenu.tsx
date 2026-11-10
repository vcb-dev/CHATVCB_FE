import {
  CheckOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  MessageOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Dropdown, message, type MenuProps } from 'antd';
import { useEffect } from 'react';
import { copyText } from '@/lib/clipboard';
import { confirmStopSeries, taskRowActions } from '@/lib/tasks';
import type { Task } from '@/types';
import { useTaskStatus } from '../hooks/useTaskStatus';
import {
  dayHeader,
  formatTime,
  quickDue,
  type CalendarItem,
  type QuickDue,
} from '../utils/calendar';

type MenuItems = NonNullable<MenuProps['items']>;

const QUICK_DUES: { kind: QuickDue; label: string }[] = [
  { kind: 'hour', label: 'Thêm 1 giờ' },
  { kind: 'tomorrow', label: 'Ngày mai' },
  { kind: 'week', label: 'Tuần sau' },
];

/** Đổi hạn ngay trên lịch chỉ dành cho người giao, khi việc còn đang làm và tin chưa thu hồi. */
export function canMoveDue(task: Task, userId: string) {
  return taskRowActions(task, userId).canEdit && task.status === 'open' && !task.recalled;
}

function dueLabel(date: Date) {
  return `${dayHeader(date)} · ${formatTime(date.toISOString())}`;
}

function taskItems(task: Task, userId: string): MenuItems {
  const actions = taskRowActions(task, userId);
  const now = new Date();
  const items: MenuItems = [
    { key: 'open', icon: <EyeOutlined />, label: 'Xem chi tiết' },
    { type: 'divider' },
  ];
  if (actions.canComplete) {
    items.push({ key: 'done', icon: <CheckOutlined />, label: 'Hoàn thành' });
  }
  if (actions.canReopen) {
    items.push({ key: 'reopen', icon: <UndoOutlined />, label: 'Mở lại' });
  }
  if (canMoveDue(task, userId)) {
    const due = task.dueAt;
    items.push({
      key: 'due',
      icon: <FieldTimeOutlined />,
      label: 'Đổi hạn',
      children: [
        ...(due
          ? QUICK_DUES.map(({ kind, label }) => ({
              key: `due:${kind}`,
              label: (
                <span className="task-menu-due">
                  {label}
                  <small>{dueLabel(quickDue(due, kind, now))}</small>
                </span>
              ),
            }))
          : []),
        ...(due ? [{ type: 'divider' as const }] : []),
        { key: 'due:pick', label: due ? 'Chọn ngày giờ khác…' : 'Đặt hạn…' },
      ],
    });
  }
  items.push(
    { key: 'copy', icon: <CopyOutlined />, label: 'Sao chép tiêu đề' },
    { key: 'chat', icon: <MessageOutlined />, label: 'Mở trong chat' },
  );
  const canStop = Boolean(task.series && !task.series.stopped && actions.canEdit);
  if (canStop || actions.canCancel) {
    items.push({ type: 'divider' });
  }
  if (canStop) {
    items.push({ key: 'stop', icon: <StopOutlined />, label: 'Dừng lặp' });
  }
  if (actions.canCancel) {
    items.push({ key: 'cancel', icon: <CloseCircleOutlined />, label: 'Hủy việc', danger: true });
  }
  return items;
}

export function TaskContextMenu(props: {
  item: CalendarItem;
  x: number;
  y: number;
  userId: string;
  onClose: () => void;
  onOpenDetail: (options?: { editDue?: boolean }) => void;
  onOpenInChat: (task: Task) => void;
  onSeriesStopped: () => void;
}) {
  const { item, userId, onClose } = props;
  const { changeStatus, moveDue, confirmCancel } = useTaskStatus();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = item.kind === 'task' ? item.task.title : item.planned.title;
  const items: MenuItems =
    item.kind === 'task'
      ? taskItems(item.task, userId)
      : [
          { key: 'open', icon: <EyeOutlined />, label: 'Xem chi tiết' },
          { key: 'copy', icon: <CopyOutlined />, label: 'Sao chép tiêu đề' },
          ...(item.planned.creator.id === userId
            ? [
                { type: 'divider' as const },
                { key: 'stop', icon: <StopOutlined />, label: 'Dừng lặp' },
              ]
            : []),
        ];

  const run = (key: string) => {
    onClose();
    if (key === 'open') {
      props.onOpenDetail();
    } else if (key === 'copy') {
      void copyText(title).then(
        () => message.success('Đã sao chép tiêu đề.'),
        () => message.error('Không sao chép được.'),
      );
    } else if (key === 'stop') {
      const seriesId = item.kind === 'task' ? item.task.series?.id : item.planned.seriesId;
      if (seriesId) {
        confirmStopSeries(seriesId, props.onSeriesStopped);
      }
    } else if (item.kind === 'task') {
      const task = item.task;
      if (key === 'done') {
        void changeStatus(task, 'done');
      } else if (key === 'reopen') {
        void changeStatus(task, 'open');
      } else if (key === 'cancel') {
        confirmCancel(task);
      } else if (key === 'chat') {
        props.onOpenInChat(task);
      } else if (key === 'due:pick') {
        props.onOpenDetail({ editDue: true });
      } else if (key.startsWith('due:') && task.dueAt) {
        void moveDue(task, quickDue(task.dueAt, key.slice(4) as QuickDue, new Date()));
      }
    }
  };

  return (
    <Dropdown
      open
      trigger={['click']}
      placement="bottomLeft"
      menu={{ items, onClick: ({ key }) => run(key), className: 'task-menu' }}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <span className="task-anchor" style={{ left: props.x, top: props.y, width: 1, height: 1 }} />
    </Dropdown>
  );
}
