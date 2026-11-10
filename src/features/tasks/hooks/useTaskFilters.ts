import { useEffect, useState } from 'react';
import type { TaskScope } from '@/types';
import type { CalendarStatus } from '../utils/status';

export type TaskView = 'week' | 'month' | 'list';

type Stored = {
  view: TaskView;
  scope: TaskScope;
  /** Nhóm được chọn để xem; rỗng là xem mọi nhóm. */
  roomIds: string[];
  hiddenStatuses: CalendarStatus[];
};

/** Bản cũ lưu `showCancelled` và nhóm bị bỏ tích; chỉ giữ lại ý "hiện việc đã hủy". */
type Legacy = Partial<Stored> & { showCancelled?: boolean };

const KEY = 'chatvcb.taskFilters';
const DEFAULTS: Stored = { view: 'week', scope: 'all', roomIds: [], hiddenStatuses: ['cancelled'] };

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const stored = JSON.parse(raw) as Legacy;
    return {
      view: stored.view ?? DEFAULTS.view,
      scope: stored.scope ?? DEFAULTS.scope,
      roomIds: Array.isArray(stored.roomIds) ? stored.roomIds : [],
      hiddenStatuses: Array.isArray(stored.hiddenStatuses)
        ? stored.hiddenStatuses
        : stored.showCancelled
          ? []
          : DEFAULTS.hiddenStatuses,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useTaskFilters() {
  const [filters, setFilters] = useState<Stored>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(filters));
    } catch {
      // Không lưu được thì chỉ mất bộ lọc khi tải lại
    }
  }, [filters]);

  return {
    ...filters,
    setView: (view: TaskView) => setFilters((f) => ({ ...f, view })),
    setScope: (scope: TaskScope) => setFilters((f) => ({ ...f, scope })),
    setRoomIds: (roomIds: string[]) => setFilters((f) => ({ ...f, roomIds })),
    toggleStatus: (status: CalendarStatus) =>
      setFilters((f) => ({
        ...f,
        hiddenStatuses: f.hiddenStatuses.includes(status)
          ? f.hiddenStatuses.filter((entry) => entry !== status)
          : [...f.hiddenStatuses, status],
      })),
  };
}
