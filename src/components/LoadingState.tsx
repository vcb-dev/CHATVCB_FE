import { Spin } from 'antd';
import type { ReactNode } from 'react';

export function LoadingState(props: {
  size?: 'small' | 'default' | 'large';
  label?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`ui-loading${props.compact ? ' is-compact' : ''}`}>
      <Spin size={props.size} />
      {props.label && <span>{props.label}</span>}
    </div>
  );
}
