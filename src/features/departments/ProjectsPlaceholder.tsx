import type { ReactNode } from 'react';
import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader } from '@/components/PageHeader';
import { ContentCard } from '@/components/ContentCard';

export function ProjectsPlaceholder({ sidebar }: { sidebar?: ReactNode }) {
  return (
    <ModuleLayout
      sidebar={sidebar}
      header={<PageHeader title="Dự án" />}
    >
      <ContentCard padded>
        <div className="dept-empty">Chức năng dự án đang được phát triển.</div>
      </ContentCard>
    </ModuleLayout>
  );
}
