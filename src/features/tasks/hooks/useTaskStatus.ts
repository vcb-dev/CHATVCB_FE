import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { Task, TaskStatus } from '@/types';

export function useTaskStatus() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const changeStatus = async (task: Task, status: TaskStatus) => {
    setBusyId(task.id);
    try {
      await api.updateTask(task.id, { status });
      await queryClient.invalidateQueries({ queryKey: queryKeys.taskLists });
      return true;
    } catch (err) {
      antMessage.error(errorText(err, 'Không cập nhật được việc.'));
      return false;
    } finally {
      setBusyId(null);
    }
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

  return { busyId, changeStatus, confirmCancel };
}
