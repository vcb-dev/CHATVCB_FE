import { api } from "@/api/client";
import { refreshSessionUser } from "@/lib/refreshAccess";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { adminKeys } from "../queries/adminKeys";

function onError(err: Error) {
  message.error(err.message);
}

export function useAdminMutations() {
  const queryClient = useQueryClient();
  const invalidateAdmin = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.all });

  /** Gọi 1 lần sau lưu quyền/role — tránh gọi `me()` lặp trong từng mutation. */
  const refreshSessionAccess = () =>
    refreshSessionUser().catch(() => null);

  return {
    refreshSessionAccess,
    createRole: useMutation({
      mutationFn: (input: {
        name: string;
        description?: string;
        cloneFromRoleId?: string;
        permissions?: string[];
      }) => api.createRole(input),
      onSuccess: async () => {
        message.success("Đã tạo role.");
        await invalidateAdmin();
      },
      onError,
    }),
    updateRole: useMutation({
      mutationFn: ({
        id,
        ...input
      }: {
        id: string;
        name?: string;
        description?: string;
      }) => api.updateRole(id, input),
      onSuccess: async () => {
        message.success("Đã cập nhật role.");
        await invalidateAdmin();
      },
      onError,
    }),
    setRolePermissions: useMutation({
      mutationFn: ({
        id,
        permissions,
      }: {
        id: string;
        permissions: string[];
      }) => api.setRolePermissions(id, permissions),
      onSuccess: async () => {
        message.success("Đã lưu quyền role.");
        await invalidateAdmin();
      },
      onError,
    }),
    deleteRole: useMutation({
      mutationFn: (id: string) => api.deleteRole(id),
      onSuccess: async () => {
        message.success("Đã xóa role.");
        await invalidateAdmin();
      },
      onError,
    }),
    createUser: useMutation({
      mutationFn: (input: {
        name: string;
        email: string;
        password?: string;
        team?: string;
        roleIds?: string[];
      }) => api.createAdminUser(input),
      onSuccess: async () => {
        await invalidateAdmin();
      },
      onError,
    }),
    updateUser: useMutation({
      mutationFn: ({
        id,
        ...input
      }: {
        id: string;
        name?: string;
        team?: string;
        isActive?: boolean;
      }) => api.updateAdminUser(id, input),
      onSuccess: async () => {
        message.success("Đã cập nhật tài khoản.");
        await invalidateAdmin();
      },
      onError,
    }),
    deactivateUser: useMutation({
      mutationFn: (id: string) => api.deactivateAdminUser(id),
      onSuccess: async () => {
        message.success("Đã khóa tài khoản.");
        await invalidateAdmin();
      },
      onError,
    }),
    resetPassword: useMutation({
      mutationFn: (id: string) => api.resetAdminUserPassword(id),
      onError,
    }),
    setUserRoles: useMutation({
      mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
        api.setAdminUserRoles(id, roleIds),
      onSuccess: async () => {
        await invalidateAdmin();
      },
      onError,
    }),
    setUserPermissions: useMutation({
      mutationFn: ({
        id,
        items,
      }: {
        id: string;
        items: { permission: string; effect: "allow" | "deny" }[];
      }) => api.setAdminUserPermissions(id, items),
      onSuccess: async () => {
        await invalidateAdmin();
      },
      onError,
    }),
  };
}
