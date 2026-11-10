import type { User } from '@/types';
import { useState } from 'react';
import { ApartmentOutlined, ProjectOutlined } from '@ant-design/icons';
import { ModuleSidebar } from '@/components/ModuleSidebar';
import { DepartmentsGroupsView } from './DepartmentsGroupsView';
import { ProjectsPlaceholder } from './ProjectsPlaceholder';

type DepartmentsSection = 'departments' | 'projects';

interface DepartmentsPageProps {
  user: User;
}

export function DepartmentsPage({ user }: DepartmentsPageProps) {
  const [section, setSection] = useState<DepartmentsSection>('departments');

  const sidebar = (
    <ModuleSidebar
      title="Phòng ban"
      activeKey={section}
      onSelect={(key) => setSection(key as DepartmentsSection)}
      groups={[
        {
          items: [
            {
              key: 'departments',
              label: 'Phòng ban & nhóm',
              icon: <ApartmentOutlined />,
            },
            {
              key: 'projects',
              label: 'Dự án',
              icon: <ProjectOutlined />,
            },
          ],
        },
      ]}
    />
  );

  return (
    <>
      {section === 'departments' ? (
        <DepartmentsGroupsView user={user} sidebar={sidebar} />
      ) : null}
      {section === 'projects' ? <ProjectsPlaceholder sidebar={sidebar} /> : null}
    </>
  );
}
