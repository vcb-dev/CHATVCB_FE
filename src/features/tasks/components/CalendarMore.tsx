import { Popover } from 'antd';
import { useState, type CSSProperties } from 'react';
import type { PlannedTask, Task } from '@/types';
import { itemKey, type CalendarItem, type ItemMenuHandler } from '../utils/calendar';
import { CalendarChip } from './CalendarChip';

export function CalendarMore(props: {
  items: CalendarItem[];
  count: number;
  className: string;
  listClassName?: string;
  style?: CSSProperties;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  onMenu?: ItemMenuHandler;
}) {
  const { onMenu } = props;
  const [open, setOpen] = useState(false);
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      destroyOnHidden
      content={
        // Portal vẫn nổi bọt qua cây React: chặn để không mở tạo việc của ô
        <div
          className={['task-cal-more-list', props.listClassName].filter(Boolean).join(' ')}
          onClick={(event) => event.stopPropagation()}
        >
          {props.items.map((item) => (
            <CalendarChip
              key={itemKey(item)}
              item={item}
              onOpen={(picked, anchor) => {
                setOpen(false);
                props.onOpen(picked, anchor);
              }}
              onOpenPlanned={(picked, anchor) => {
                setOpen(false);
                props.onOpenPlanned(picked, anchor);
              }}
              onMenu={
                onMenu
                  ? (picked, point, anchor) => {
                      setOpen(false);
                      onMenu(picked, point, anchor);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      }
    >
      <button
        type="button"
        className={props.className}
        style={props.style}
        onClick={(event) => event.stopPropagation()}
      >
        +{props.count} việc
      </button>
    </Popover>
  );
}
