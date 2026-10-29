import { api } from '@/api/client';
import type { OrgDepartment, OrgGroup, OrgUnitStatus } from '../types';

export interface UpsertDepartmentPayload {
  name: string;
  code: string;
  status?: OrgUnitStatus;
}

export interface UpsertDepartmentGroupPayload {
  name: string;
  leaderName?: string;
  memberCount?: number;
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

export function createDepartmentGroup(
  departmentId: string,
  payload: UpsertDepartmentGroupPayload,
) {
  return api.createDepartmentGroup(departmentId, payload);
}

export type UpdateDepartmentGroupPayload = Partial<
  Omit<UpsertDepartmentGroupPayload, 'leaderName'> & { leaderName?: string | null }
>;

export function updateDepartmentGroup(
  departmentId: string,
  groupId: string,
  payload: UpdateDepartmentGroupPayload,
) {
  return api.updateDepartmentGroup(departmentId, groupId, payload);
}

export function deleteDepartmentGroup(departmentId: string, groupId: string) {
  return api.deleteDepartmentGroup(departmentId, groupId);
}

export type { OrgDepartment, OrgGroup };
