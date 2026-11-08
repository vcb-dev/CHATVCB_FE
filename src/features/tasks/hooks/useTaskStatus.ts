import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { Task, TaskStatus } from '@/types';

type TaskPatch = { status?: TaskStatus; title?: string; notes?: string; dueAt?: string | null };

export function useTaskStatus() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const patchTask = async (task: Task, patch: TaskPatch, success?: string) => {
    setBusyId(task.id);
    try {
      await api.updateTask(task.id, patch);
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskLists });
      if (success) {
        antMessage.success(success);
      }
      return true;
    } catch (err) {
      antMessage.error(errorText(err, 'Không cập nhật được việc.'));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = (task: Task, status: TaskStatus) => patchTask(task, { status });

  /** Đổi hạn từ màn Công việc; chặn sớm hạn đã qua như hộp thoại giao việc. */
  const moveDue = (task: Task, due: Date) => {
    if (due <= new Date()) {
      antMessage.error('Hạn phải sau thời điểm hiện tại.');
      return Promise.resolve(false);
    }
    return patchTask(task, { dueAt: due.toISOString() }, 'Đã đổi hạn.');
  };

  const confirmCancel = (task: Task, onDone?: () => void) => {
    Modal.confirm({
      title: 'Hủy việc này?',
      content: 'Cả người giao và người nhận sẽ thấy việc đã hủy.',
      okText: 'Hủy việc',
      cancelText: 'Không',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (await changeStatus(task, 'cancelled')) {
          onDone?.();
        }
      },
    });
  };

  return { busyId, changeStatus, patchTask, moveDue, confirmCancel };
}
