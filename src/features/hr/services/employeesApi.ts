import { api } from "@/api/client";
import type { EmployeeProfile } from "../types";

export const fetchEmployees = () => api.employees();
export const fetchEmployee = (id: string) => api.employee(id);
export const createEmployee = (
  body: Partial<EmployeeProfile> & { password?: string; roleIds?: string[] },
) => api.createEmployee(body);
export const updateEmployee = (id: string, body: Partial<EmployeeProfile>) =>
  api.updateEmployee(id, body);
