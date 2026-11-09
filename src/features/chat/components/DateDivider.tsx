import { dayLabel } from '../utils/format';

export function DateDivider(props: { iso: string }) {
  return (
    <div className="date-divider">
      <span>{dayLabel(props.iso, new Date())}</span>
    </div>
  );
}

