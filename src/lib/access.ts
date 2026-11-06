import type { User } from "@/types";

export const P = {
  departments: {
    read: "departments.read",
    create: "departments.create",
    update: "departments.update",
    delete: "departments.delete",
  },
  users: {
    read: "users.read",
    create: "users.create",
    update: "users.update",
    deactivate: "users.deactivate",
    resetPassword: "users.reset_password",
    assignRole: "users.assign_role",
  },
  roles: {
    read: "roles.read",
    create: "roles.create",
    update: "roles.update",
    delete: "roles.delete",
  },
  employees: {
    read: "employees.read",
    readSensitive: "employees.read_sensitive",
    create: "employees.create",
    update: "employees.update",
    updateSensitive: "employees.update_sensitive",
  },
  gallery: {
    review: "gallery.review",
    readPrivate: "gallery.read_private",
  },
  news: {
    publish: "news.publish",
    facebook: "news.facebook",
  },
} as const;
/** Kiểm tra quyền truy cập */
export function can(
  user: User | null | undefined,
  permission: string,
): boolean {
  const owned = user?.permissions ?? [];
  return owned.includes("*") || owned.includes(permission);
}

/** Kiểm tra quyền truy cập cho nhiều quyền */
export function canAny(
  user: User | null | undefined,
  permissions: string[],
): boolean {
  /** Kiểm tra nếu có ít nhất một quyền trong danh sách */
  return permissions.some((item) => can(user, item));
}
