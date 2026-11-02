export const adminKeys = {
  all: ["admin"] as const,
  roles: () => [...adminKeys.all, "roles"] as const,
  catalog: () => [...adminKeys.all, "catalog"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  access: (id: string) => [...adminKeys.all, "access", id] as const,
};
