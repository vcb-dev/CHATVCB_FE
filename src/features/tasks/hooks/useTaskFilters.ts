import { useEffect, useState } from 'react';
import type { TaskScope } from '@/types';

export type TaskView = 'week' | 'month' | 'list';

type Stored = {
  view: TaskView;
  scope: TaskScope;
  /** Lưu nhóm bị bỏ tích: nhóm mới có việc sẽ tự hiện. */
  hiddenRooms: string[];
  showCancelled: boolean;
};

const KEY = 'chatvcb.taskFilters';
const DEFAULTS: Stored = { view: 'week', scope: 'all', hiddenRooms: [], showCancelled: false };

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Stored>) } : DEFAULTS;
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
    setShowCancelled: (showCancelled: boolean) => setFilters((f) => ({ ...f, showCancelled })),
    setHiddenRooms: (hiddenRooms: string[]) => setFilters((f) => ({ ...f, hiddenRooms })),
    toggleRoom: (roomId: string) =>
      setFilters((f) => ({
        ...f,
        hiddenRooms: f.hiddenRooms.includes(roomId)
          ? f.hiddenRooms.filter((id) => id !== roomId)
          : [...f.hiddenRooms, roomId],
      })),
  };
}
