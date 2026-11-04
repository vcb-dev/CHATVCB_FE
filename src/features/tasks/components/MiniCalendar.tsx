import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { addMonths, dateKey, monthGrid, monthTitle, startOfMonth, WEEKDAYS } from '../utils/calendar';

export function MiniCalendar(props: { anchor: Date; onPick: (day: Date) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(props.anchor));
  const days = useMemo(() => monthGrid(month), [month]);
  const todayKey = dateKey(new Date());
  const anchorKey = dateKey(props.anchor);

  useEffect(() => {
    setMonth(startOfMonth(props.anchor));
  }, [props.anchor]);

  return (
    <div className="tasks-mini">
      <div className="tasks-mini-head">
        <strong className="tasks-mini-title">{monthTitle(month)}</strong>
        <span>
          <Button
            type="text"
            size="small"
            aria-label="Tháng trước"
            className="tasks-mini-prev"
            icon={<LeftOutlined />}
            onClick={() => setMonth((current) => addMonths(current, -1))}
          />
          <Button
            type="text"
            size="small"
            aria-label="Tháng sau"
            className="tasks-mini-next"
            icon={<RightOutlined />}
            onClick={() => setMonth((current) => addMonths(current, 1))}
          />
        </span>
      </div>
      <div className="tasks-mini-grid">
        {WEEKDAYS.map((day) => (
          <span key={day} className="tasks-mini-weekday">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const cls = [
            'tasks-mini-day',
            day.getMonth() === month.getMonth() ? '' : 'other-month',
            key === todayKey ? 'today' : '',
            key === anchorKey ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={key}
              type="button"
              className={cls}
              data-date={key}
              onClick={() => props.onPick(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
