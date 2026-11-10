import type { ReactNode } from 'react';

export type ModuleSidebarItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  badge?: number;
};

export type ModuleSidebarGroup = {
  title?: string;
  items: ModuleSidebarItem[];
};

export function ModuleSidebar(props: {
  title: string;
  action?: ReactNode;
  groups: ModuleSidebarGroup[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="ui-sidebar">
      <div className="ui-sidebar-title">{props.title}</div>
      {props.action && <div className="ui-sidebar-action">{props.action}</div>}
      <div className="ui-sidebar-content ui-scroll">
        {props.children}
        {props.groups.map((group, gIdx) => (
          <div className="ui-sidebar-group" key={group.title || gIdx}>
            {group.title && (
              <div className="ui-sidebar-group-title">{group.title}</div>
            )}
            {group.items.map((item) => {
              const active = item.key === props.activeKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`ui-sidebar-item${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => props.onSelect?.(item.key)}
                >
                  {item.icon}
                  <span className="ui-sidebar-label">{item.label}</span>
                  {typeof item.count === 'number' && (
                    <span className="ui-sidebar-count">{item.count}</span>
                  )}
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="ui-sidebar-badge">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {props.footer && <div className="ui-sidebar-footer">{props.footer}</div>}
    </aside>
  );
}
