import { useState } from 'react';
import { DepartmentsGroupsView } from './DepartmentsGroupsView';
import { DepartmentsModuleNav } from './DepartmentsModuleNav';
import { ProjectsPlaceholder } from './ProjectsPlaceholder';

type DepartmentsSection = 'departments' | 'projects';

export function DepartmentsPage() {
  const [section, setSection] = useState<DepartmentsSection>('departments');

  return (
    <div className="dept-module-shell">
      <DepartmentsModuleNav active={section} onChange={setSection} />
      {section === 'departments' ? <DepartmentsGroupsView /> : null}
      {section === 'projects' ? <ProjectsPlaceholder /> : null}
    </div>
  );
}
