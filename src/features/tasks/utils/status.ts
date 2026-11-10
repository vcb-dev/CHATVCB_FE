import { isOverdue, TASK_STATUS_LABEL } from '@/lib/tasks';
import type { Task, TaskStatus } from '@/types';
import type { CalendarItem } from './calendar';

/** Trạng thái để tô màu: tách "Quá hạn" khỏi "Đang làm" và thêm kỳ "Dự kiến" của việc lặp. */
export type CalendarStatus = TaskStatus | 'overdue' | 'planned';

export const CALENDAR_STATUSES: CalendarStatus[] = ['open', 'overdue', 'done', 'cancelled', 'planned'];

export const CALENDAR_STATUS_LABEL: Record<CalendarStatus, string> = {
  ...TASK_STATUS_LABEL,
  overdue: 'Quá hạn',
  planned: 'Dự kiến',
};

export function taskStatus(task: Pick<Task, 'status' | 'dueAt'>): CalendarStatus {
  return isOverdue(task) ? 'overdue' : task.status;
}

export function itemStatus(item: CalendarItem): CalendarStatus {
  return item.kind === 'planned' ? 'planned' : taskStatus(item.task);
}

export function countByStatus(statuses: CalendarStatus[]): Record<CalendarStatus, number> {
  const counts: Record<CalendarStatus, number> = { open: 0, overdue: 0, done: 0, cancelled: 0, planned: 0 };
  for (const status of statuses) {
    counts[status] += 1;
  }
  return counts;
}
