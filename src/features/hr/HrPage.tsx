import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { useCallback, useMemo, useState } from 'react';
import { EmployeeDetailView } from './EmployeeDetailView';
import { EmployeeListView } from './EmployeeListView';
import { MOCK_EMPLOYEES } from './mockEmployees';
import type { EmployeeProfile } from './types';

interface HrPageProps {
  user: User;
}

export function HrPage({ user }: HrPageProps) {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canCreate = can(user, P.employees.create);
  const canUpdate = can(user, P.employees.update);
  const canReadSensitive = can(user, P.employees.readSensitive);
  const canUpdateSensitive = can(user, P.employees.updateSensitive);

  const selected = useMemo(
    () => employees.find((item) => item.id === selectedId),
    [employees, selectedId],
  );

  const handleSave = useCallback((next: EmployeeProfile) => {
    setEmployees((current) => current.map((item) => (item.id === next.id ? next : item)));
  }, []);

  if (selected) {
    return (
      <EmployeeDetailView
        profile={selected}
        canUpdate={canUpdate}
        canReadSensitive={canReadSensitive}
        canUpdateSensitive={canUpdateSensitive}
        onBack={() => setSelectedId(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <EmployeeListView
      employees={employees}
      canCreate={canCreate}
      onOpen={setSelectedId}
    />
  );
}
