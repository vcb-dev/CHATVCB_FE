import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import type { PlannedTask, Task } from '@/types';
import {
  dateKey,
  formatTime,
  groupByDay,
  hourLabel,
  HOUR_HEIGHT,
  itemKey,
  SLOT_HEIGHT,
  stackDay,
  timezoneLabel,
  toLocalValue,
  WEEK_HEADERS,
  type CalendarItem,
} from '../utils/calendar';
import { CalendarChip } from './CalendarChip';
import { CalendarMore } from './CalendarMore';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const CHIP_HEIGHT = SLOT_HEIGHT - 2;
// Tính cả chiều cao nhãn "Bây giờ" lẫn chữ mốc giờ: gần hơn khoảng này thì hai bên đè lên nhau
const NOW_LABEL_MINUTES = 22;

function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function rowStyle(top: number): CSSProperties {
  return { position: 'absolute', top, height: CHIP_HEIGHT, left: 0, width: 'calc(100% - 2px)' };
}

export function TaskWeekView(props: {
  days: Date[];
  items: CalendarItem[];
  draftDue?: string;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  onCreate: (dueAt: string, anchor: DOMRect) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) {
      // Chừa khoảng trên để mốc đầu tiên không bị tiêu đề ngày che mất nửa chữ
      scroller.scrollTop = 7 * HOUR_HEIGHT - 12;
    }
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const byDay = useMemo(() => groupByDay(props.items), [props.items]);

  const todayKey = dateKey(now);
  const nowMinutes = minutesOf(now);
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;
  const showNow = props.days.some((day) => dateKey(day) === todayKey);

  const createAt = (day: Date, event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(((event.clientY - box.top) / HOUR_HEIGHT) * 2) * 30;
    const due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
    if (due > now) {
      const top = box.top + (minutes / 60) * HOUR_HEIGHT;
      props.onCreate(toLocalValue(due), new DOMRect(box.left, top, box.width, CHIP_HEIGHT));
    }
  };

  return (
    <div className="task-week">
      <div className="task-week-scroll" ref={scrollRef}>
        <div className="task-week-inner">
          <div className="task-week-head">
            <span className="task-week-zone">{timezoneLabel(now)}</span>
            {props.days.map((day) => (
              <div
                key={dateKey(day)}
                className={dateKey(day) === todayKey ? 'task-week-day today' : 'task-week-day'}
              >
                <span>{WEEK_HEADERS[day.getDay()]}</span>
                <strong>{day.getDate()}</strong>
              </div>
            ))}
          </div>
          <div className="task-week-body">
            <div className="task-week-hours">
              {showNow ? (
                <div className="task-week-now-label" style={{ top: nowTop }}>
                  Bây giờ
                  <br />
                  {formatTime(now.toISOString())}
                </div>
              ) : null}
              {HOURS.map((hour) => {
                const hidden =
                  hour === 0 ||
                  (showNow && Math.abs(nowMinutes - hour * 60) < NOW_LABEL_MINUTES);
                return (
                  <span key={hour} style={{ height: HOUR_HEIGHT }}>
                    {hidden ? '' : hourLabel(hour)}
                  </span>
                );
              })}
            </div>
            {props.days.map((day) => {
              const key = dateKey(day);
              return (
                <div
                  key={key}
                  className="task-week-col"
                  data-date={key}
                  style={{ height: HOUR_HEIGHT * 24 }}
                  onClick={(event) => createAt(day, event)}
                >
                  {key === todayKey ? (
                    <span className="task-week-now" style={{ top: nowTop }} />
                  ) : null}
                  {stackDay(byDay.get(key) ?? []).map((row) =>
                    row.kind === 'chip' ? (
                      <CalendarChip
                        key={itemKey(row.item)}
                        item={row.item}
                        onOpen={props.onOpen}
                        onOpenPlanned={props.onOpenPlanned}
                        style={rowStyle(row.top)}
                      />
                    ) : (
                      <CalendarMore
                        key={itemKey(row.items[0])}
                        items={row.items}
                        count={row.items.length}
                        className="task-week-more"
                        listClassName="task-week-more-list"
                        style={rowStyle(row.top)}
                        onOpen={props.onOpen}
                        onOpenPlanned={props.onOpenPlanned}
                      />
                    ),
                  )}
                  {props.draftDue && dateKey(new Date(props.draftDue)) === key ? (
                    <div
                      className="task-week-draft"
                      style={{
                        top: (minutesOf(new Date(props.draftDue)) / 60) * HOUR_HEIGHT,
                        height: CHIP_HEIGHT,
                      }}
                    >
                      {formatTime(props.draftDue)} Việc mới
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
