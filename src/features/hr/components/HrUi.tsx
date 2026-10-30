import type { ReactNode } from 'react';

export function HrSectionCard(props: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="hr-section-card">
      <header className="hr-section-head">
        <span className="hr-section-icon">{props.icon}</span>
        <div>
          <h3>{props.title}</h3>
          <p>{props.subtitle}</p>
        </div>
      </header>
      <div className="hr-section-body">{props.children}</div>
    </section>
  );
}

export function HrField(props: { label: string; value: string; highlight?: boolean; wide?: boolean }) {
  const display = props.value.trim() || '—';
  return (
    <div
      className={`hr-field${props.highlight ? ' highlight' : ''}${props.wide ? ' wide' : ''}`}
    >
      <span className="hr-field-label">{props.label}</span>
      <span className="hr-field-value">{display}</span>
    </div>
  );
}

export function HrFieldGrid(props: { children: ReactNode }) {
  return <div className="hr-field-grid">{props.children}</div>;
}

export function HrPersonRow(props: { label: string; name: string }) {
  return (
    <div className="hr-person-row">
      <span className="hr-person-avatar" aria-hidden />
      <div>
        <span className="hr-field-label">{props.label}</span>
        <strong>{props.name.trim() || '—'}</strong>
      </div>
    </div>
  );
}

export function HrSubBlock(props: { title: string; children: ReactNode }) {
  return (
    <div className="hr-sub-block">
      <h4>{props.title}</h4>
      {props.children}
    </div>
  );
}

export function HrSensitiveBanner() {
  return (
    <div className="hr-sensitive-banner" role="note">
      <span aria-hidden>🔒</span>
      <p>Thông tin nhạy cảm chỉ hiển thị với bạn và bộ phận nhân sự.</p>
    </div>
  );
}

export function HrDocPlaceholder(props: { label: string }) {
  return (
    <div className="hr-doc-slot">
      <span className="hr-field-label">{props.label}</span>
      <div className="hr-doc-frame">
        <span>Chưa tải ảnh</span>
      </div>
    </div>
  );
}
