import { adminKeys } from "@/features/admin/queries/adminKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { employeeKeys } from "../queries/employeeKeys";
import { createEmployee, updateEmployee } from "../services/employeesApi";
import type { EmployeeProfile } from "../types";

async function invalidatePeople(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
    queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  ]);
}

export function useCreateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fullName: string;
      email: string;
      password?: string;
    }) => createEmployee(input),
    onSuccess: async () => {
      await invalidatePeople(queryClient);
      message.success("Đã tạo nhân viên.");
    },
    onError: (err: Error) => message.error(err.message),
  });
}

export function useUpdateEmployeeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: EmployeeProfile) =>
      updateEmployee(profile.id, profile),
    onSuccess: async () => {
      await invalidatePeople(queryClient);
      message.success("Đã lưu hồ sơ.");
    },
    onError: (err: Error) => message.error(err.message),
  });
}
