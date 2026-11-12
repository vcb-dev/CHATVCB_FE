import { ModuleLayout } from '@/components/ModuleLayout';
import { PageHeader, type PageTabs } from '@/components/PageHeader';
import { ContentCard } from '@/components/ContentCard';

export function ProjectsPlaceholder({ tabs }: { tabs?: PageTabs }) {
  return (
    <ModuleLayout header={<PageHeader title="Phòng ban" tabs={tabs} />}>
      <ContentCard padded>
        <div className="dept-empty">Chức năng dự án đang được phát triển.</div>
      </ContentCard>
    </ModuleLayout>
  );
}
