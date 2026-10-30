import type { OrgDepartment } from "../types";

/** Chọn phòng ban */
export function departmentSelectOptions(departments: OrgDepartment[]) {
  return departments
    .filter((d) => d.status === "active")
    .map((d) => ({
      value: d.name,
      label: d.name,
      code: d.code,
    }));
}

/** Chọn nhóm phòng ban */
export function groupSelectOptionsForDepartment(
  departments: OrgDepartment[],
  departmentName: string,
) {
  const dept = departments.find((d) => d.name === departmentName);
  if (!dept) return [];
  return dept.groups
    .filter((g) => g.status === "active")
    .map((g) => ({ value: g.name, label: g.name }));
}
