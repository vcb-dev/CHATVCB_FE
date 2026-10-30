import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { departmentKeys } from '../queries/departmentKeys';
import {
  createDepartmentGroup,
  deleteDepartmentGroup,
  updateDepartmentGroup,
  type UpdateDepartmentGroupPayload,
  type UpsertDepartmentGroupPayload,
} from '../services/departmentsApi';

function invalidateDepartments(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: departmentKeys.all });
}

export function useDepartmentGroupMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({
      departmentId,
      payload,
    }: {
      departmentId: string;
      payload: UpsertDepartmentGroupPayload;
    }) => createDepartmentGroup(departmentId, payload),
    onSuccess: async () => {
      message.success('Đã thêm nhóm.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({
      departmentId,
      groupId,
      payload,
    }: {
      departmentId: string;
      groupId: string;
      payload: UpdateDepartmentGroupPayload;
    }) => updateDepartmentGroup(departmentId, groupId, payload),
    onSuccess: async () => {
      message.success('Đã cập nhật nhóm.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const remove = useMutation({
    mutationFn: ({
      departmentId,
      groupId,
    }: {
      departmentId: string;
      groupId: string;
    }) => deleteDepartmentGroup(departmentId, groupId),
    onSuccess: async () => {
      message.success('Đã xóa nhóm.');
      await invalidateDepartments(queryClient);
    },
    onError: (err: Error) => message.error(err.message),
  });

  return { create, update, remove };
}
