import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { WorkTask } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Hiện banner khi còn ≤ 30 phút tới hạn, giữ tối đa 1 giờ sau khi quá hạn. */
export const TASK_BANNER_LEAD_MS = 30 * 60_000;
export const TASK_BANNER_OVERDUE_KEEP_MS = 60 * 60_000;
const TICK_MS = 30_000;
const REFETCH_MS = 60_000;

/** Khóa đóng banner: id + hạn → đổi hạn thì banner hiện lại. */
function bannerKey(task: WorkTask) {
  return `${task.id}:${task.dueAt ?? ''}`;
}

/**
 * Việc được giao cho `myId`, chưa xong, sắp / vừa hết hạn.
 * Banner không tự tắt: chỉ biến mất khi `dismiss`, xong việc hoặc đổi hạn.
 */
export function useTaskDueBanners(myId: string) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const { data: tasks } = useQuery({
    queryKey: queryKeys.myTasks,
    queryFn: () => api.myTasks('assigned'),
    refetchInterval: REFETCH_MS,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const banners = useMemo(() => {
    return (tasks ?? [])
      .filter((task) => {
        if (task.status === 'done' || !task.dueAt || task.assignee.id !== myId) return false;
        if (dismissed.has(bannerKey(task))) return false;
        const left = new Date(task.dueAt).getTime() - now;
        return left <= TASK_BANNER_LEAD_MS && -left <= TASK_BANNER_OVERDUE_KEEP_MS;
      })
      .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());
  }, [tasks, myId, dismissed, now]);

  const dismiss = useCallback((task: WorkTask) => {
    setDismissed((prev) => new Set(prev).add(bannerKey(task)));
  }, []);

  return { banners, now, dismiss };
}
