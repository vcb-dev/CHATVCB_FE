import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState, type ReactNode } from 'react';

export function InfoSection(props: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  return (
    <div className={`info-section ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="info-section-head"
        onClick={() => setOpen((c) => !c)}
      >
        <span className="info-section-title">
          <span>{props.title}</span>
          {typeof props.count === 'number' ? (
            <span className="info-section-count"> ({props.count})</span>
          ) : null}
        </span>
        <span className="info-section-extra">
          {props.extra ? (
            <span
              className="info-section-action"
              onClick={(e) => e.stopPropagation()}
            >
              {props.extra}
            </span>
          ) : null}
          {open ? (
            <DownOutlined className="info-section-chev" />
          ) : (
            <RightOutlined className="info-section-chev" />
          )}
        </span>
      </button>
      {open ? <div className="info-section-body">{props.children}</div> : null}
    </div>
  );
}
