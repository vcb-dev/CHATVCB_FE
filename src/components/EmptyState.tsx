import type { ReactNode } from 'react';

export function EmptyState(props: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`ui-empty${props.compact ? ' is-compact' : ''}`}>
      {props.icon && <div className="ui-empty-icon">{props.icon}</div>}
      <div className="ui-empty-title">{props.title}</div>
      {props.description && (
        <div className="ui-empty-desc">{props.description}</div>
      )}
      {props.action && <div className="ui-empty-action">{props.action}</div>}
    </div>
  );
}
