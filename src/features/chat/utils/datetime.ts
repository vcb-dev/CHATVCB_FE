const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function fromLocalInput(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

export function formatShort(iso: string): string {
  const d = new Date(iso);
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const y = d.getFullYear();
  return `${h}:${min} ${day}/${month}/${y}`;
}

export function formatTimeDayMonth(iso: string): string {
  const d = new Date(iso);
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  return `${h}:${min} ${day}/${month}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${pad(totalSec % 60)}`;
}

export function formatRoomTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (isNaN(d.getTime())) return '';
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
