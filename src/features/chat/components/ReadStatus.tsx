import { CheckOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

/** Vòng tròn cạnh tin của mình trong nhóm: rỗng = chưa ai đọc, đầy dần theo số người đã đọc, có dấu tích = đọc hết. */
export function ReadStatus({
  read,
  total,
  onOpen,
}: {
  read: number;
  total: number;
  onOpen: (anchor: HTMLElement) => void;
}) {
  const all = read >= total;
  const label = all ? `Cả ${total} người đã đọc` : `${read}/${total} người đã đọc`;
  return (
    <button
      type="button"
      className={all ? 'read-status all' : 'read-status'}
      style={{ '--p': Math.round((read / total) * 100) } as CSSProperties}
      title={label}
      aria-label={label}
      onClick={(event) => onOpen(event.currentTarget)}
    >
      {all ? <CheckOutlined /> : null}
    </button>
  );
}
