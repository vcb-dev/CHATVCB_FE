import type { User } from '@/types';
import { useState } from 'react';
import type { PageTabs } from '@/components/PageHeader';
import { DepartmentsGroupsView } from './DepartmentsGroupsView';
import { ProjectsPlaceholder } from './ProjectsPlaceholder';

type DepartmentsSection = 'departments' | 'projects';

interface DepartmentsPageProps {
  user: User;
}

export function DepartmentsPage({ user }: DepartmentsPageProps) {
  const [section, setSection] = useState<DepartmentsSection>('departments');

  const tabs: PageTabs = {
    items: [
      { key: 'departments', label: 'Phòng ban & nhóm' },
      { key: 'projects', label: 'Dự án' },
    ],
    activeKey: section,
    onChange: (key) => setSection(key as DepartmentsSection),
  };

  return (
    <>
      {section === 'departments' ? (
        <DepartmentsGroupsView user={user} tabs={tabs} />
      ) : null}
      {section === 'projects' ? <ProjectsPlaceholder tabs={tabs} /> : null}
    </>
  );
}
