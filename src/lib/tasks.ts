import { Modal, message } from 'antd';
import { api } from '@/api/client';
import { errorText } from '@/lib/errors';
import type { Room, Task, TaskRoom, TaskSeriesInfo, TaskStatus } from '@/types';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Đang làm',
  done: 'Đã xong',
  cancelled: 'Đã hủy',
};

export function seriesLabel(series: TaskSeriesInfo): string {
  const base = series.frequency === 'weekly' ? 'Lặp hằng tuần' : 'Lặp hằng tháng';
  return series.stopped ? `${base} · đã dừng` : base;
}

/** Danh sách và thẻ cập nhật qua sự kiện socket `task`, `message.updated` nên không cần tự sửa cache. */
export function confirmStopSeries(seriesId: string, onDone?: () => void) {
  Modal.confirm({
    title: 'Dừng lặp việc này?',
    content: 'Các kỳ đã tạo vẫn giữ nguyên.',
    okText: 'Dừng lặp',
    cancelText: 'Không',
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await api.stopTaskSeries(seriesId);
        onDone?.();
      } catch (err) {
        message.error(errorText(err, 'Không dừng được việc lặp.'));
      }
    },
  });
}

/** Chỉ để ẩn lối vào cho đỡ rối; BE mới là nơi chặn thật. */
export function canAssignTask(room: Room): boolean {
  if (room.isCloud || room.blockedByMe) {
    return false;
  }
  if (room.type === 'direct' || room.kind === 'direct') {
    return true;
  }
  const restricted = room.settings?.adminOnlySend || (room.settings?.adminOnlyTask ?? true);
  return !(restricted && room.myRole === 'member');
}

export function isOverdue(task: { status: TaskStatus; dueAt: string | null }): boolean {
  return task.status === 'open' && Boolean(task.dueAt) && new Date(task.dueAt as string) < new Date();
}

export function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function taskRoomLabel(task: Task | TaskRoom, userId: string): string {
  if (task.roomName) {
    return task.roomName;
  }
  const other = task.creator.id === userId ? task.assignee : task.creator;
  return other.id === userId ? 'Chat riêng' : `Chat với ${other.name}`;
}

export function taskActions(
  task: { status: TaskStatus; creatorId: string; assigneeId: string; assigneeCanCancel: boolean },
  userId: string,
) {
  const isCreator = task.creatorId === userId;
  const isAssignee = task.assigneeId === userId;
  const isParty = isCreator || isAssignee;
  return {
    canComplete: task.status === 'open' && isParty,
    canCancel: task.status === 'open' && (isCreator || (isAssignee && task.assigneeCanCancel)),
    canReopen: (task.status === 'done' && isParty) || (task.status === 'cancelled' && isCreator),
    canEdit: isCreator,
  };
}

/** Thao tác trên một việc ở màn Công việc; tin đã thu hồi thì việc chỉ còn để xem. */
export function taskRowActions(task: Task, userId: string) {
  const actions = taskActions(
    { ...task, creatorId: task.creator.id, assigneeId: task.assignee.id },
    userId,
  );
  return task.recalled
    ? { ...actions, canComplete: false, canCancel: false, canReopen: false }
    : actions;
}
