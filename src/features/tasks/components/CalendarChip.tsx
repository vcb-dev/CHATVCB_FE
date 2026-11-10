import type { CSSProperties } from 'react';
import type { PlannedTask, Task } from '@/types';
import type { CalendarItem, ItemMenuHandler } from '../utils/calendar';
import { PlannedChip } from './PlannedChip';
import { TaskChip } from './TaskChip';

export function CalendarChip(props: {
  item: CalendarItem;
  block?: boolean;
  onOpen: (task: Task, anchor: DOMRect) => void;
  onOpenPlanned: (planned: PlannedTask, anchor: DOMRect) => void;
  onMenu?: ItemMenuHandler;
  style?: CSSProperties;
}) {
  const { item, style, block, onMenu } = props;
  return item.kind === 'task' ? (
    <TaskChip task={item.task} block={block} onOpen={props.onOpen} onMenu={onMenu} style={style} />
  ) : (
    <PlannedChip
      planned={item.planned}
      block={block}
      onOpen={props.onOpenPlanned}
      onMenu={onMenu}
      style={style}
    />
  );
}
