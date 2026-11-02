import { P, can, canAny } from '@/lib/access';
import type { User } from '@/types';
import type { Workspace } from '@/features/chat/hooks/useWorkspace';

/** Một workspace trên shell — thêm module mới: thêm dòng + CSS `.module-{id}`. */
export type WorkspaceAccess =
  | { kind: 'open' }
  | { kind: 'permission'; permission: string }
  | { kind: 'any'; permissions: string[] };

export const WORKSPACE_REGISTRY: {
  id: Workspace;
  label: string;
  access: WorkspaceAccess;
}[] = [
  { id: 'messenger', label: 'Messenger', access: { kind: 'open' } },
  { id: 'tasks', label: 'Công việc', access: { kind: 'open' } },
  { id: 'contacts', label: 'Danh bạ', access: { kind: 'open' } },
  { id: 'email', label: 'Email', access: { kind: 'open' } },
  { id: 'docs', label: 'Docs', access: { kind: 'open' } },
  { id: 'meetings', label: 'Cuộc họp', access: { kind: 'open' } },
  { id: 'hr', label: 'Nhân sự', access: { kind: 'permission', permission: P.employees.read } },
  {
    id: 'departments',
    label: 'Phòng ban',
    access: { kind: 'permission', permission: P.departments.read },
  },
  {
    id: 'admin',
    label: 'Phân quyền',
    access: { kind: 'any', permissions: [P.roles.read, P.users.read] },
  },
];

export function canAccessWorkspace(
  user: User | null | undefined,
  workspace: Workspace,
): boolean {
  const entry = WORKSPACE_REGISTRY.find((item) => item.id === workspace);
  if (!entry) {
    return false;
  }
  const { access } = entry;
  if (access.kind === 'open') {
    return true;
  }
  if (access.kind === 'permission') {
    return can(user, access.permission);
  }
  return canAny(user, access.permissions);
}

export function visibleWorkspaces(user: User | null | undefined) {
  return WORKSPACE_REGISTRY.filter((item) => canAccessWorkspace(user, item.id));
}

/** Workspace full-width (không sidebar chat). Dùng khi thêm CSS. */
export const FULL_WIDTH_WORKSPACE_IDS: Workspace[] = WORKSPACE_REGISTRY.map(
  (item) => item.id,
).filter((id) => id !== 'messenger');
