import type { AdminRole, PermissionGroup } from "./types";
import { permissionKeysInGroup } from "./permissionCatalog";

export function allPermissionKeys(groups: PermissionGroup[]): string[] {
  return groups.flatMap((group) => permissionKeysInGroup(group));
}

/** Quyền gộp từ các role đã chọn (* → toàn bộ key catalog). */
export function permissionsFromRoles(
  roleIds: string[],
  roles: AdminRole[],
  groups: PermissionGroup[],
): string[] {
  const all = allPermissionKeys(groups);
  const merged = new Set<string>();
  for (const id of roleIds) {
    const role = roles.find((item) => item.id === id);
    if (!role) continue;
    if (role.permissions.includes("*")) {
      return all;
    }
    for (const permission of role.permissions) {
      if (permission !== "*") {
        merged.add(permission);
      }
    }
  }
  return [...merged].sort();
}

/** So sánh quyền muốn với quyền từ role → overlay allow/deny (BE giữ nguyên). */
export function overridesFromEffective(
  rolePermissions: string[],
  effectiveWanted: string[],
  allKeys: string[],
): { permission: string; effect: "allow" | "deny" }[] {
  const fromRole = new Set(rolePermissions.filter((p) => p !== "*"));
  const want = new Set(effectiveWanted);
  const items: { permission: string; effect: "allow" | "deny" }[] = [];
  for (const permission of allKeys) {
    const hasFromRole = fromRole.has(permission);
    const checked = want.has(permission);
    if (hasFromRole && !checked) {
      items.push({ permission, effect: "deny" });
    } else if (!hasFromRole && checked) {
      items.push({ permission, effect: "allow" });
    }
  }
  return items;
}
