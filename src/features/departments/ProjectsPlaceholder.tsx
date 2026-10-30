import { Typography } from 'antd';

export function ProjectsPlaceholder() {
  return (
    <main className="dept-page">
      <div className="dept-hero">
        <section className="dept-hero-main">
          <Typography.Text className="dept-eyebrow">Tổ chức</Typography.Text>
          <h1>Dự án</h1>
          <p>Quản lý dự án nội bộ — màn hình demo, sẽ bổ sung sau.</p>
        </section>
      </div>
      <div className="dept-empty">Chức năng dự án đang được phát triển.</div>
    </main>
  );
}
