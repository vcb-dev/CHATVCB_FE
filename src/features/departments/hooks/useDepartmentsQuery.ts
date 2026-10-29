import { useQuery } from '@tanstack/react-query';
import { departmentKeys } from '../queries/departmentKeys';
import { fetchDepartments } from '../services/departmentsApi';

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: fetchDepartments,
  });
}
