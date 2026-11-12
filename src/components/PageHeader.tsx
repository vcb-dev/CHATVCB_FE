import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';

export type PageTab = {
  key: string;
  label: string;
  count?: number;
};

/** Mục cố định của một màn, hiện thành hàng tab dưới tiêu đề (thay cho cột menu trái). */
export type PageTabs = {
  items: PageTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

function TabBar({ tabs }: { tabs: PageTabs }) {
  return (
    <nav className="ui-page-tabs" aria-label="Mục">
      {tabs.items.map((item) => {
        const active = item.key === tabs.activeKey;
        return (
          <button
            key={item.key}
            type="button"
            className={`ui-page-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => tabs.onChange(item.key)}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span className="ui-page-tab-count">{item.count}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function PageHeader(props: {
  title: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  /** Một mục thì không vẽ hàng tab */
  tabs?: PageTabs;
  /** Nằm bên phải hàng tab, hợp với một ô tìm. Không có hàng tab thì xuống hàng công cụ */
  tabsExtra?: ReactNode;
  /** Hàng công cụ (bộ lọc) riêng một dòng, dưới hàng tab nếu có */
  children?: ReactNode;
}) {
  const showTabs = Boolean(props.tabs && props.tabs.items.length > 1);
  const extraInTools = !showTabs && props.tabsExtra;
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
      {showTabs && props.tabs && (
        <div className="ui-page-tabs-row">
          <TabBar tabs={props.tabs} />
          {props.tabsExtra && <div className="ui-page-tabs-extra">{props.tabsExtra}</div>}
        </div>
      )}
      {(props.children || extraInTools) && (
        <div className="ui-page-tools">
          {extraInTools && props.tabsExtra}
          {props.children}
        </div>
      )}
    </header>
  );
}
