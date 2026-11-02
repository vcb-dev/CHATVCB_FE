import type { User } from '@/types';
import { useState } from 'react';
import { DepartmentsGroupsView } from './DepartmentsGroupsView';
import { DepartmentsModuleNav } from './DepartmentsModuleNav';
import { ProjectsPlaceholder } from './ProjectsPlaceholder';

type DepartmentsSection = 'departments' | 'projects';

interface DepartmentsPageProps {
  user: User;
}

export function DepartmentsPage({ user }: DepartmentsPageProps) {
  const [section, setSection] = useState<DepartmentsSection>('departments');

  return (
    <div className="dept-module-shell">
      <DepartmentsModuleNav active={section} onChange={setSection} />
      {section === 'departments' ? <DepartmentsGroupsView user={user} /> : null}
      {section === 'projects' ? <ProjectsPlaceholder /> : null}
    </div>
  );
}
