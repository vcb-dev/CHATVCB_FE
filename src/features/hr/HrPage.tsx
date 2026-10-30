import { useCallback, useMemo, useState } from 'react';
import { EmployeeDetailView } from './EmployeeDetailView';
import { EmployeeListView } from './EmployeeListView';
import { MOCK_EMPLOYEES } from './mockEmployees';
import type { EmployeeProfile } from './types';

export function HrPage() {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        onBack={() => setSelectedId(null)}
        onSave={handleSave}
      />
    );
  }

  return <EmployeeListView employees={employees} onOpen={setSelectedId} />;
}
