import { useQuery } from "@tanstack/react-query";
import { employeeKeys } from "../queries/employeeKeys";
import { fetchEmployees } from "../services/employeesApi";

export function useEmployeesQuery(enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.list(),
    queryFn: fetchEmployees,
    enabled,
  });
}
