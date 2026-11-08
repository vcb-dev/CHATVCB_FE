import type { PlannedTask, Task } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
/** Đầu cột lịch tháng, tuần bắt đầu từ thứ Hai. */
export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const HOUR_HEIGHT = 72;
export const SLOT_HEIGHT = HOUR_HEIGHT / 2;
/** Khung giờ làm việc mặc định; tuần có việc ngoài khung thì tự giãn ra. */
export const WORK_HOURS = { start: 7, end: 18 };
export type HourRange = { start: number; end: number };

const MAX_STACK = 4;
const GRID_DAYS = 42;
const MINUTE = 60_000;

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** Sáu tuần trọn vẹn, bắt đầu từ thứ Hai, để lưới không đổi chiều cao giữa các tháng. */
export function monthGrid(anchor: Date): Date[] {
  const first = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: GRID_DAYS }, (_, index) => addDays(first, index));
}

/** Tuần chứa ngày đang chọn, từ thứ Hai tới Chủ nhật. */
export function weekDays(anchor: Date): Date[] {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function rangeOf(days: Date[]): { from: string; to: string } {
  return {
    from: days[0].toISOString(),
    to: addDays(days[days.length - 1], 1).toISOString(),
  };
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayMonth(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "T2, 02/11" */
export function dayHeader(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${dayMonth(date)}`;
}

export function monthTitle(anchor: Date): string {
  return `Tháng ${anchor.getMonth() + 1}, ${anchor.getFullYear()}`;
}

/** "02/11 – 08/11/2026"; khác năm thì ghi năm ở cả hai đầu. */
export function rangeTitle(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  const head =
    first.getFullYear() === last.getFullYear()
      ? dayMonth(first)
      : `${dayMonth(first)}/${first.getFullYear()}`;
  return `${head} – ${dayMonth(last)}/${last.getFullYear()}`;
}

export function isPastDay(date: Date, now: Date): boolean {
  return dateKey(date) < dateKey(now);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function hourLabel(hour: number): string {
  return `${pad(hour)}:00`;
}

/** Giá trị cho ô datetime-local theo giờ máy. */
export function toLocalValue(date: Date): string {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Hạn gợi ý khi bấm vào một ngày: 17:00, hoặc một giờ tới nếu hôm nay đã quá 17:00. */
export function presetDue(day: Date, now: Date): string {
  const due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 0);
  return toLocalValue(due > now ? due : new Date(now.getTime() + 60 * MINUTE));
}

/** "còn 3 giờ", "quá 2 ngày": đủ để biết gấp tới đâu mà không phải nhẩm. */
export function relativeDue(iso: string, now: Date): string {
  const minutes = Math.round((new Date(iso).getTime() - now.getTime()) / MINUTE);
  const size = Math.abs(minutes);
  if (size < 1) {
    return 'đến hạn';
  }
  const amount =
    size < 60
      ? `${size} phút`
      : size < 24 * 60
        ? `${Math.floor(size / 60)} giờ`
        : `${Math.floor(size / (24 * 60))} ngày`;
  return `${minutes > 0 ? 'còn' : 'quá'} ${amount}`;
}

export type QuickDue = 'hour' | 'tomorrow' | 'week';

/** Dời hạn nhanh; việc đã quá hạn thì tính từ bây giờ để hạn mới luôn ở tương lai. */
export function quickDue(dueIso: string, kind: QuickDue, now: Date): Date {
  const due = new Date(dueIso);
  const atDueTime = (day: Date) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), due.getHours(), due.getMinutes());
  if (kind === 'hour') {
    return new Date(Math.max(due.getTime(), now.getTime()) + 60 * MINUTE);
  }
  if (kind === 'tomorrow') {
    return atDueTime(addDays(now, 1));
  }
  return atDueTime(addDays(due > now ? due : now, 7));
}

/** Một mục trên lịch: việc thật hoặc kỳ dự kiến của việc lặp lại. */
export type CalendarItem =
  | { kind: 'task'; task: Task }
  | { kind: 'planned'; planned: PlannedTask };

export function itemDue(item: CalendarItem): string {
  return item.kind === 'task' ? (item.task.dueAt as string) : item.planned.dueAt;
}

export function itemKey(item: CalendarItem): string {
  return item.kind === 'task' ? item.task.id : `${item.planned.seriesId}:${item.planned.dueAt}`;
}

export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dateKey(new Date(itemDue(item)));
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => itemDue(a).localeCompare(itemDue(b)));
  }
  return map;
}

/** Giờ làm việc, giãn thêm cho vừa việc sớm nhất và muộn nhất trong khoảng đang xem. */
export function hourRange(items: CalendarItem[]): HourRange {
  let { start, end } = WORK_HOURS;
  for (const item of items) {
    const hour = new Date(itemDue(item)).getHours();
    start = Math.min(start, hour);
    end = Math.max(end, hour + 1);
  }
  return { start, end };
}

/** Việc còn phải làm hiện trước, việc đã kết thúc nhường chỗ khi một cụm quá đông. */
function itemRank(item: CalendarItem): number {
  if (item.kind === 'planned') {
    return 1;
  }
  return { open: 0, done: 2, cancelled: 3 }[item.task.status];
}

function naturalTop(item: CalendarItem, range: HourRange): number {
  const due = new Date(itemDue(item));
  return ((due.getHours() * 60 + due.getMinutes()) / 60 - range.start) * HOUR_HEIGHT;
}

export type DayRow =
  | { kind: 'chip'; item: CalendarItem; top: number }
  | { kind: 'more'; items: CalendarItem[]; top: number };

/**
 * Việc chỉ có hạn, không có thời lượng nên không có lý do chia cột như sự kiện:
 * việc gần giờ nhau xếp chồng xuống dưới và rộng hết cột, giờ chính xác ghi trên thẻ.
 */
export function stackDay(items: CalendarItem[], range: HourRange): DayRow[] {
  const sorted = [...items].sort(
    (a, b) => itemDue(a).localeCompare(itemDue(b)) || itemRank(a) - itemRank(b),
  );
  const clusters: CalendarItem[][] = [];
  let bottom = 0;
  for (const item of sorted) {
    const top = naturalTop(item, range);
    const current = clusters[clusters.length - 1];
    if (current && top < bottom) {
      current.push(item);
      bottom += SLOT_HEIGHT;
    } else {
      clusters.push([item]);
      bottom = top + SLOT_HEIGHT;
    }
  }

  const rows: DayRow[] = [];
  for (const cluster of clusters) {
    const crowded = cluster.length > MAX_STACK;
    const kept = crowded
      ? [...cluster].sort((a, b) => itemRank(a) - itemRank(b)).slice(0, MAX_STACK - 1)
      : cluster;
    let y = 0;
    for (const item of cluster.filter((entry) => kept.includes(entry))) {
      y = Math.max(y, naturalTop(item, range));
      rows.push({ kind: 'chip', item, top: y });
      y += SLOT_HEIGHT;
    }
    if (crowded) {
      rows.push({
        kind: 'more',
        items: cluster.filter((entry) => !kept.includes(entry)),
        top: y,
      });
    }
  }

  // Cụm sát cuối khung giờ: đẩy ngược lên để không tràn khỏi lưới
  let limit = (range.end - range.start) * HOUR_HEIGHT;
  for (const row of [...rows].reverse()) {
    row.top = Math.min(row.top, limit - SLOT_HEIGHT);
    limit = row.top;
  }
  return rows;
}

/** Chuột phải lên một mục: tọa độ để đặt menu, khung của thẻ để mở chi tiết cạnh đó. */
export type ItemMenuHandler = (
  item: CalendarItem,
  point: { x: number; y: number },
  anchor: DOMRect,
) => void;
