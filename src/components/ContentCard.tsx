import type { ReactNode } from 'react';

export function ContentCard(props: {
  title?: ReactNode;
  extra?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['ui-card', props.padded ? 'padded' : '', props.className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {(props.title || props.extra) && (
        <div className="ui-card-head">
          <span>{props.title}</span>
          {props.extra && <span>{props.extra}</span>}
        </div>
      )}
      {props.children}
    </div>
  );
}
