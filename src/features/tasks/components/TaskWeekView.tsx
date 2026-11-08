import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import type { PlannedTask, Task } from '@/types';
import {
  dateKey,
  dayHeader,
  formatTime,
  groupByDay,
  hourLabel,
  HOUR_HEIGHT,
  isPastDay,
  itemKey,
  SLOT_HEIGHT,
  stackDay,
  toLocalValue,
  type CalendarItem,
  type HourRange,
  type ItemMenuHandler,
} from '../utils/calendar';
import { CalendarChip } from './CalendarChip';
import { CalendarMore } from './CalendarMore';

const CHIP_HEIGHT = SLOT_HEIGHT - 2;

function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function rowStyle(top: number): CSSProperties {
  return { position: 'absolute', top, height: CHIP_HEIGHT, left: 2, width: 'calc(100% - 5px)' };
}

/** Nhãn giờ nằm ở đầu hàng: nhãn "bây giờ" đè lên nếu cách mốc giờ trong khoảng này. */
function nearHourLabel(nowMinutes: number, hour: number) {
  const diff = nowMinutes - hour * 60;
  return diff > -10 && diff < 22;
}

export function TaskWeekView(props: {
  days: Date[];
  items: CalendarItem[];
  range: HourRange;
  draftDue?: string;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  onCreate: (dueAt: string, anchor: DOMRect) => void;
  onMenu: ItemMenuHandler;
}) {
  const { range } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const hours = Array.from({ length: range.end - range.start }, (_, index) => range.start + index);
  const height = hours.length * HOUR_HEIGHT;
  const offset = (minutes: number) => (minutes / 60 - range.start) * HOUR_HEIGHT;

  const todayKey = dateKey(now);
  const nowMinutes = minutesOf(now);
  const nowTop = offset(nowMinutes);
  const showNow =
    props.days.some((day) => dateKey(day) === todayKey) &&
    nowMinutes >= range.start * 60 &&
    nowMinutes <= range.end * 60;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Màn thấp không chứa hết khung giờ: chỉ cuộn khi vạch "bây giờ" bị khuất, để thấy cả buổi sáng
  useEffect(() => {
    const scroller = scrollRef.current;
    const head = scroller?.querySelector('.task-week-head')?.clientHeight ?? 0;
    const visible = (scroller?.clientHeight ?? 0) - head;
    if (scroller && showNow && nowTop > visible - HOUR_HEIGHT / 2) {
      scroller.scrollTop = nowTop - visible / 3;
    }
    // Chỉ khi đổi tuần: cuộn theo từng phút sẽ giật màn hình người đang xem
  }, [props.days]);

  const byDay = useMemo(() => groupByDay(props.items), [props.items]);

  const createAt = (day: Date, event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const slot = Math.floor(((event.clientY - box.top) / HOUR_HEIGHT) * 2);
    const minutes = range.start * 60 + slot * 30;
    const due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
    if (due > now) {
      const top = box.top + slot * SLOT_HEIGHT;
      props.onCreate(toLocalValue(due), new DOMRect(box.left, top, box.width, CHIP_HEIGHT));
    }
  };

  return (
    <div className="task-week">
      <div className="task-week-scroll" ref={scrollRef}>
        <div className="task-week-inner">
          <div className="task-week-head">
            <span className="task-week-corner" />
            {props.days.map((day) => {
              const key = dateKey(day);
              const today = key === todayKey;
              const cls = ['task-week-day', today ? 'today' : '', isPastDay(day, now) ? 'past' : '']
                .filter(Boolean)
                .join(' ');
              return (
                <div key={key} className={cls}>
                  <span>{dayHeader(day)}</span>
                  {today ? <span className="task-week-today">Hôm nay</span> : null}
                </div>
              );
            })}
          </div>
          <div className="task-week-body">
            <div className="task-week-hours" style={{ height }}>
              {showNow ? (
                <div className="task-week-now-label" style={{ top: nowTop }}>
                  {formatTime(now.toISOString())}
                </div>
              ) : null}
              {hours.map((hour) => (
                <span key={hour} style={{ height: HOUR_HEIGHT }}>
                  {showNow && nearHourLabel(nowMinutes, hour) ? '' : hourLabel(hour)}
                </span>
              ))}
            </div>
            {props.days.map((day) => {
              const key = dateKey(day);
              const cls = [
                'task-week-col',
                key === todayKey ? 'today' : '',
                isPastDay(day, now) ? 'past' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={key}
                  className={cls}
                  data-date={key}
                  style={{ height }}
                  onClick={(event) => createAt(day, event)}
                >
                  {hours.map((hour) => (
                    <div key={hour} className="task-week-slot" style={{ height: HOUR_HEIGHT }} />
                  ))}
                  {key === todayKey && showNow ? (
                    <span className="task-week-now" style={{ top: nowTop }} />
                  ) : null}
                  {stackDay(byDay.get(key) ?? [], range).map((row) =>
                    row.kind === 'chip' ? (
                      <CalendarChip
                        key={itemKey(row.item)}
                        item={row.item}
                        block
                        onOpen={props.onOpen}
                        onOpenPlanned={props.onOpenPlanned}
                        onMenu={props.onMenu}
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
                        onMenu={props.onMenu}
                      />
                    ),
                  )}
                  {props.draftDue && dateKey(new Date(props.draftDue)) === key ? (
                    <div
                      className="task-week-draft"
                      style={{
                        top: offset(minutesOf(new Date(props.draftDue))),
                        height: CHIP_HEIGHT,
                      }}
                    >
                      {formatTime(props.draftDue)} · Việc mới
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
