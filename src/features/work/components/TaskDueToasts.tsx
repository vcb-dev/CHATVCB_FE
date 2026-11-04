import { Button, notification } from 'antd';
import { useEffect, useRef } from 'react';
import type { WorkTask } from '@/types';
import { useTaskDueBanners } from '../hooks/useTaskDueBanners';

function span(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'dưới 1 phút';
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
}

function statusText(task: WorkTask, now: number) {
  const left = new Date(task.dueAt as string).getTime() - now;
  if (left < 0) return `Đã quá hạn ${span(-left)}`;
  if (left < 60_000) return 'Hết hạn trong dưới 1 phút';
  return `Còn ${span(left)} là hết hạn`;
}

const toastKey = (task: WorkTask) => `task-due-${task.id}`;

interface TaskDueToastsProps {
  myId: string;
  onOpenTask: (task: WorkTask) => void;
}

/**
 * Toast cảnh báo việc sắp hết hạn, hiện ở mọi màn hình.
 * `duration: 0` → không tự tắt; chỉ biến mất khi bấm X (hoặc xong việc / đổi hạn).
 */
export function TaskDueToasts({ myId, onOpenTask }: TaskDueToastsProps) {
  const [api, holder] = notification.useNotification({ placement: 'topRight', stack: false });
  const { banners, now, dismiss } = useTaskDueBanners(myId);
  const openRef = useRef(onOpenTask);
  openRef.current = onOpenTask;
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    const live = new Set(banners.map(toastKey));
    // Việc không còn cần cảnh báo (xong, đổi hạn, đã đóng) → gỡ toast.
    for (const key of shownRef.current) {
      if (!live.has(key)) {
        api.destroy(key);
        shownRef.current.delete(key);
      }
    }
    for (const task of banners) {
      const key = toastKey(task);
      const overdue = new Date(task.dueAt as string).getTime() < now;
      shownRef.current.add(key);
      // Cùng key → antd cập nhật nội dung tại chỗ (đếm lùi), không nhảy lại.
      api.open({
        key,
        duration: 0,
        showProgress: false,
        pauseOnHover: false,
        closable: { 'aria-label': 'Đóng cảnh báo' },
        type: overdue ? 'error' : 'warning',
        title: task.title,
        description: statusText(task, now),
        actions: (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              openRef.current(task);
            }}
          >
            Mở
          </Button>
        ),
        onClose: () => dismiss(task),
      });
    }
  }, [banners, now, api, dismiss]);

  return holder;
}
