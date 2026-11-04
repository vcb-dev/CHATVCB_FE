export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  userCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  team: string;
  avatarUrl: string;
  isActive: boolean;
  createdAt: string;
  roles: { id: string; key: string; name: string; isSystem: boolean }[];
}

export interface PermissionCatalogItem {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionCatalogItem[];
}

export interface UserAccess {
  roles: AdminUser["roles"];
  rolePermissions: string[];
  overrides: { permission: string; effect: "allow" | "deny" }[];
  effective: string[];
}
