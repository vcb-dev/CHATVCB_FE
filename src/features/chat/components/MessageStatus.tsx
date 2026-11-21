import { Tooltip } from 'antd';
import type { Delivery } from '../utils/seen';

/** Trạng thái dưới tin của mình; "đã xem" là avatar người đọc (SeenAvatars/ReadStatus), không nằm ở đây. */
export type MessageStatusKind = 'sending' | 'waiting' | Delivery | 'failed';

const LABEL: Record<Exclude<MessageStatusKind, 'failed'>, string> = {
  sending: 'Đang gửi',
  waiting: 'Đang chờ có mạng để gửi',
  sent: 'Đã gửi',
  delivered: 'Đã nhận',
};

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function StatusIcon({ kind }: { kind: MessageStatusKind }) {
  if (kind === 'sent') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <path d="M3.5 8.5l3 3 6-6.5" {...stroke} />
      </svg>
    );
  }
  if (kind === 'delivered') {
    return (
      <svg viewBox="0 0 20 16" width="17" height="14" aria-hidden>
        <path d="M1.5 8.5l3 3 6-6.5" {...stroke} />
        <path d="M8.25 10.75l.75.75 6-6.5" {...stroke} />
      </svg>
    );
  }
  if (kind === 'failed') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.5v4.25" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="1" fill="#fff" />
      </svg>
    );
  }
  // Đang gửi / chờ mạng: đồng hồ
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <circle cx="8" cy="8" r="6" {...stroke} />
      <path d="M8 5v3l2 1.25" {...stroke} />
    </svg>
  );
}

export function MessageStatus({
  kind,
  error,
  onRetry,
  onDiscard,
}: {
  kind: MessageStatusKind;
  /** Câu lỗi server (di chuột vào dấu đỏ để xem). */
  error?: string;
  onRetry?: () => void;
  onDiscard?: () => void;
}) {
  if (kind === 'failed') {
    return (
      <span className="msg-status failed" onClick={(event) => event.stopPropagation()}>
        <Tooltip title={error || 'Gửi tin thất bại.'}>
          <span className="msg-status-icon" role="img" aria-label={error || 'Gửi tin thất bại.'}>
            <StatusIcon kind="failed" />
          </span>
        </Tooltip>
        Gửi lỗi ·{' '}
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
        {' | '}
        <button type="button" onClick={onDiscard}>
          Xóa
        </button>
      </span>
    );
  }
  return (
    <span className={`msg-status ${kind}`}>
      <Tooltip title={LABEL[kind]}>
        <span className="msg-status-icon" role="img" aria-label={LABEL[kind]}>
          <StatusIcon kind={kind} />
        </span>
      </Tooltip>
      {kind === 'waiting' ? 'Chờ mạng' : null}
    </span>
  );
}
