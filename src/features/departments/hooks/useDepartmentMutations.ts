import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { departmentKeys } from '../queries/departmentKeys';
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
  type UpsertDepartmentPayload,
} from '../services/departmentsApi';

function invalidateDepartments(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: departmentKeys.all });
}

export function useDepartmentMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: UpsertDepartmentPayload) => createDepartment(payload),
    onSuccess: async () => {
      message.success('Đã thêm phòng ban.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UpsertDepartmentPayload> }) =>
      updateDepartment(id, payload),
    onSuccess: async () => {
      message.success('Đã cập nhật phòng ban.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: async () => {
      message.success('Đã xóa phòng ban.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  return { create, update, remove };
}
