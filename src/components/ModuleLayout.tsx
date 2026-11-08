import type { ReactNode } from 'react';

export function ModuleLayout(props: {
  sidebar: ReactNode;
  header?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="ui-module">
      {props.sidebar}
      <section className="ui-module-main">
        {props.header}
        <div className={`ui-module-body${props.flush ? ' flush' : ''}`}>
          {props.children}
        </div>
      </section>
    </div>
  );
}
