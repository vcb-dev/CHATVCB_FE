import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  SyncOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { TaskStatus } from '@/types';

export type CalendarStatus = TaskStatus | 'overdue' | 'planned';

const ICONS: Record<CalendarStatus, ReactNode> = {
  open: <ClockCircleFilled />,
  overdue: <ExclamationCircleFilled />,
  done: <CheckCircleFilled />,
  cancelled: <CloseCircleFilled />,
  planned: <SyncOutlined />,
};

export function TaskStatusIcon({ status }: { status: CalendarStatus }) {
  return <span className={`task-chip-icon ${status}`}>{ICONS[status]}</span>;
}
