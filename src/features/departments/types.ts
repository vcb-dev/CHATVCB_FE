export type OrgUnitStatus = 'active' | 'inactive';

export interface OrgGroup {
  id: string;
  name: string;
  leaderName: string | null;
  memberCount: number;
  status: OrgUnitStatus;
}

export interface OrgDepartment {
  id: string;
  name: string;
  code: string;
  status: OrgUnitStatus;
  groups: OrgGroup[];
}

export function orgDepartmentMemberCount(dept: OrgDepartment): number {
  return dept.groups.reduce((sum, g) => sum + g.memberCount, 0);
}

export function orgStructureStats(departments: OrgDepartment[]) {
  const groupCount = departments.reduce((n, d) => n + d.groups.length, 0);
  const memberCount = departments.reduce((n, d) => n + orgDepartmentMemberCount(d), 0);
  return {
    departmentCount: departments.length,
    groupCount,
    memberCount,
  };
}
