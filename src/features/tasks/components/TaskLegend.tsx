import { CALENDAR_STATUSES, CALENDAR_STATUS_LABEL, type CalendarStatus } from '../utils/status';

/** Chú thích kiêm bộ lọc: bấm một trạng thái để ẩn/hiện việc mang màu đó. */
export function TaskLegend(props: {
  counts: Record<CalendarStatus, number>;
  statuses?: CalendarStatus[];
  hidden: CalendarStatus[];
  onToggle: (status: CalendarStatus) => void;
}) {
  return (
    <div className="task-legend">
      <span className="task-legend-label">Màu theo trạng thái:</span>
      {(props.statuses ?? CALENDAR_STATUSES).map((status) => {
        const off = props.hidden.includes(status);
        return (
          <button
            key={status}
            type="button"
            className={['task-legend-item', status, off ? 'off' : ''].filter(Boolean).join(' ')}
            aria-pressed={!off}
            title={off ? 'Bấm để hiện lại' : 'Bấm để ẩn'}
            onClick={() => props.onToggle(status)}
          >
            <span className="task-legend-dot" />
            {CALENDAR_STATUS_LABEL[status]} ({props.counts[status]})
          </button>
        );
      })}
      <span className="task-legend-hint">Bấm vào trạng thái để ẩn/hiện</span>
    </div>
  );
}
