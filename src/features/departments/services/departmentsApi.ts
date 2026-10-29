import { api } from '@/api/client';
import type { OrgDepartment, OrgUnitStatus } from '../types';

export interface UpsertDepartmentPayload {
  name: string;
  code: string;
  status?: OrgUnitStatus;
}

export function fetchDepartments() {
  return api.departments();
}

export function createDepartment(payload: UpsertDepartmentPayload) {
  return api.createDepartment(payload);
}

export function updateDepartment(id: string, payload: Partial<UpsertDepartmentPayload>) {
  return api.updateDepartment(id, payload);
}

export function deleteDepartment(id: string) {
  return api.deleteDepartment(id);
}

export type { OrgDepartment };
