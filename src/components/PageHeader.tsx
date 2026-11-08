import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';

export function PageHeader(props: {
  title: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header-main">
        {props.onBack && (
          <button
            type="button"
            className="ui-page-header-back"
            aria-label="Quay lại"
            onClick={props.onBack}
          >
            <ArrowLeftOutlined />
          </button>
        )}
        {props.icon && <span className="ui-page-icon">{props.icon}</span>}
        <h1 className="ui-page-title">{props.title}</h1>
        {props.meta && <div className="ui-page-meta">{props.meta}</div>}
        {props.actions && <div className="ui-page-actions">{props.actions}</div>}
      </div>
      {props.children && <div className="ui-page-tools">{props.children}</div>}
    </header>
  );
}
