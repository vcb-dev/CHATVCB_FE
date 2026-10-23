export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
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
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const y = d.getFullYear();
  return `${h}:${min} ${day}/${month}/${y}`;
}

export function formatTimeDayMonth(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  return `${h}:${min} ${day}/${month}`;
}
