import { api } from "@/api/client";

export const fetchRoles = () => api.roles();
export const fetchCatalog = () => api.permissionsCatalog();
export const fetchAdminUsers = () => api.adminUsers();
export const fetchUserAccess = (id: string) => api.adminUserAccess(id);
