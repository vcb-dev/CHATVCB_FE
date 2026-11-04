import type { PlannedTask, Task } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

export const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const WEEK_HEADERS = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];

export const HOUR_HEIGHT = 56;
export const SLOT_HEIGHT = HOUR_HEIGHT / 2;
const MAX_STACK = 4;
const GRID_DAYS = 42;

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Sáu tuần trọn vẹn, bắt đầu từ Chủ nhật, để lưới không đổi chiều cao giữa các tháng. */
export function monthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  return Array.from({ length: GRID_DAYS }, (_, index) => addDays(first, index - first.getDay()));
}

/** Bảy ngày tính từ ngày đang chọn, để việc ngày mai không bị đẩy sang trang sau vào cuối tuần. */
export function weekDays(anchor: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(anchor, index));
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

export function monthTitle(anchor: Date): string {
  return `Tháng ${anchor.getMonth() + 1}, ${anchor.getFullYear()}`;
}

export function weekTitle(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (first.getMonth() === last.getMonth()) {
    return monthTitle(first);
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `Tháng ${first.getMonth() + 1} – ${last.getMonth() + 1}, ${last.getFullYear()}`;
  }
  return `${monthTitle(first)} – ${monthTitle(last)}`;
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

export function timezoneLabel(now: Date): string {
  const hours = -now.getTimezoneOffset() / 60;
  return `GMT${hours >= 0 ? '+' : ''}${hours}`;
}

/** Giá trị cho ô datetime-local theo giờ máy. */
export function toLocalValue(date: Date): string {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Hạn gợi ý khi bấm vào một ngày: 17:00, hoặc một giờ tới nếu hôm nay đã quá 17:00. */
export function presetDue(day: Date, now: Date): string {
  const due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 0);
  return toLocalValue(due > now ? due : new Date(now.getTime() + 60 * 60 * 1000));
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

/** Việc còn phải làm hiện trước, việc đã kết thúc nhường chỗ khi một cụm quá đông. */
function itemRank(item: CalendarItem): number {
  if (item.kind === 'planned') {
    return 1;
  }
  return { open: 0, done: 2, cancelled: 3 }[item.task.status];
}

function naturalTop(item: CalendarItem): number {
  const due = new Date(itemDue(item));
  return ((due.getHours() * 60 + due.getMinutes()) / 60) * HOUR_HEIGHT;
}

export type DayRow =
  | { kind: 'chip'; item: CalendarItem; top: number }
  | { kind: 'more'; items: CalendarItem[]; top: number };

/**
 * Việc chỉ có hạn, không có thời lượng nên không có lý do chia cột như sự kiện:
 * việc gần giờ nhau xếp chồng xuống dưới và rộng hết cột, giờ chính xác ghi trên thẻ.
 */
export function stackDay(items: CalendarItem[]): DayRow[] {
  const sorted = [...items].sort(
    (a, b) => itemDue(a).localeCompare(itemDue(b)) || itemRank(a) - itemRank(b),
  );
  const clusters: CalendarItem[][] = [];
  let bottom = 0;
  for (const item of sorted) {
    const top = naturalTop(item);
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
      y = Math.max(y, naturalTop(item));
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

  // Cụm sát nửa đêm: đẩy ngược lên để không tràn khỏi lưới
  let limit = HOUR_HEIGHT * 24;
  for (const row of [...rows].reverse()) {
    row.top = Math.min(row.top, limit - SLOT_HEIGHT);
    limit = row.top;
  }
  return rows;
}
