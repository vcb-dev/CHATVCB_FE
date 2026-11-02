import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "../queries/adminKeys";
import {
  fetchAdminUsers,
  fetchCatalog,
  fetchRoles,
} from "../services/adminApi";

export function useRolesQuery() {
  return useQuery({ queryKey: adminKeys.roles(), queryFn: fetchRoles });
}

import { normalizeCatalogGroups } from "../permissionCatalog";

export function useCatalogQuery() {
  return useQuery({
    queryKey: adminKeys.catalog(),
    queryFn: fetchCatalog,
    select: normalizeCatalogGroups,
  });
}

export function useAdminUsersQuery() {
  return useQuery({ queryKey: adminKeys.users(), queryFn: fetchAdminUsers });
}
