import type { CSSProperties } from 'react';
import type { PlannedTask, Task } from '@/types';
import type { CalendarItem } from '../utils/calendar';
import { PlannedChip } from './PlannedChip';
import { TaskChip } from './TaskChip';

export function CalendarChip(props: {
  item: CalendarItem;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  style?: CSSProperties;
}) {
  const { item, style } = props;
  return item.kind === 'task' ? (
    <TaskChip task={item.task} onOpen={props.onOpen} style={style} />
  ) : (
    <PlannedChip planned={item.planned} onOpen={props.onOpenPlanned} style={style} />
  );
}
