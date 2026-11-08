import { useMemo } from 'react';
import type { PlannedTask, Task } from '@/types';
import {
  dateKey,
  groupByDay,
  isPastDay,
  itemKey,
  monthGrid,
  WEEKDAYS,
  type CalendarItem,
  type ItemMenuHandler,
} from '../utils/calendar';
import { CalendarChip } from './CalendarChip';
import { CalendarMore } from './CalendarMore';

const MAX_CHIPS = 3;

export function TaskCalendar(props: {
  anchor: Date;
  items: CalendarItem[];
  draftDue?: string;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  onCreate: (day: Date, anchor: DOMRect) => void;
  onMenu: ItemMenuHandler;
}) {
  const now = new Date();
  const todayKey = dateKey(now);
  const draftKey = props.draftDue ? dateKey(new Date(props.draftDue)) : null;
  const grid = useMemo(() => monthGrid(props.anchor), [props.anchor]);
  const byDay = useMemo(() => groupByDay(props.items), [props.items]);

  return (
    <div className="task-cal">
      <div className="task-cal-head">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="task-cal-grid">
        {grid.map((day) => {
          const key = dateKey(day);
          const list = byDay.get(key) ?? [];
          const hidden = list.length - MAX_CHIPS;
          const past = isPastDay(day, now);
          const cls = [
            'task-cal-cell',
            day.getMonth() === props.anchor.getMonth() ? '' : 'other-month',
            key === todayKey ? 'today' : '',
            past ? 'past' : '',
            key === draftKey ? 'drafting' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={key}
              className={cls}
              data-date={key}
              onClick={(event) => {
                if (!past) {
                  props.onCreate(day, event.currentTarget.getBoundingClientRect());
                }
              }}
            >
              <span className="task-cal-day">{day.getDate()}</span>
              {list.slice(0, MAX_CHIPS).map((item) => (
                <CalendarChip
                  key={itemKey(item)}
                  item={item}
                  onOpen={props.onOpen}
                  onOpenPlanned={props.onOpenPlanned}
                  onMenu={props.onMenu}
                />
              ))}
              {hidden > 0 ? (
                <CalendarMore
                  items={list}
                  count={hidden}
                  className="task-cal-more"
                  onOpen={props.onOpen}
                  onOpenPlanned={props.onOpenPlanned}
                  onMenu={props.onMenu}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
