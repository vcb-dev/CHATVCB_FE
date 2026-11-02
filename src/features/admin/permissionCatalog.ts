import type { PermissionGroup } from "./types";

/** Dự phòng khi BE chưa trả nhãn (cache cũ). */
const FALLBACK_LABELS: Record<string, string> = {
  "*": "Toàn quyền hệ thống",
  "departments.read": "Xem phòng ban và nhóm",
  "departments.create": "Thêm phòng ban",
  "departments.update": "Sửa phòng ban / nhóm",
  "departments.delete": "Xóa phòng ban",
  "users.read": "Xem danh sách tài khoản",
  "users.create": "Tạo tài khoản mới",
  "users.update": "Sửa thông tin tài khoản",
  "users.deactivate": "Khóa tài khoản",
  "users.reset_password": "Đặt lại mật khẩu",
  "users.assign_role": "Gán vai trò cho tài khoản",
  "roles.read": "Xem vai trò và quyền",
  "roles.create": "Tạo vai trò mới",
  "roles.update": "Sửa vai trò và phân quyền",
  "roles.delete": "Xóa vai trò",
  "employees.read": "Xem hồ sơ nhân viên",
  "employees.read_sensitive": "Xem thông tin nhạy cảm (CCCD, lương…)",
  "employees.create": "Tạo hồ sơ nhân viên",
  "employees.update": "Cập nhật hồ sơ nhân viên",
  "employees.update_sensitive": "Sửa thông tin nhạy cảm",
  "gallery.review": "Duyệt ảnh, gỡ ảnh và quản lý album",
  "gallery.read_private": "Xem ảnh private trong Thư viện ảnh",
};

export function normalizeCatalogGroups(
  groups: PermissionGroup[] | { key: string; label: string; items: unknown[] }[],
): PermissionGroup[] {
  return groups.map((group) => ({
    key: group.key,
    label: group.label,
    items: group.items.map((item) => {
      if (typeof item === "string") {
        return { key: item, label: FALLBACK_LABELS[item] ?? item };
      }
      const row = item as { key: string; label?: string };
      return {
        key: row.key,
        label: row.label ?? FALLBACK_LABELS[row.key] ?? row.key,
      };
    }),
  }));
}

export function permissionKeysInGroup(group: PermissionGroup): string[] {
  return group.items.map((item) => item.key);
}

/** Chuẩn hóa quyền role admin (*) thành tick đủ trên UI. */
export function permissionsForRoleEditor(
  rolePermissions: string[],
  groups: PermissionGroup[],
): string[] {
  if (rolePermissions.includes("*")) {
    return groups.flatMap((group) => permissionKeysInGroup(group));
  }
  return rolePermissions.filter((item) => item !== "*");
}

export function permissionLabel(
  groups: PermissionGroup[],
  key: string,
): string {
  for (const group of groups) {
    const hit = group.items.find((item) => item.key === key);
    if (hit) return hit.label;
  }
  return FALLBACK_LABELS[key] ?? key;
}
