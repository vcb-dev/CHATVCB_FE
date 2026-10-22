export const EMPTY_SHEET = {
  cols: 16,
  rows: Array.from({ length: 40 }, () => Array.from({ length: 16 }, () => '')),
};

export type CellStyle = { b?: boolean; i?: boolean; u?: boolean; color?: string; bg?: string; size?: number; align?: 'left' | 'center' | 'right' };

export type SheetData = { cols: number; rows: string[][]; styles?: Record<string, CellStyle> };

export type WorkbookTab = { name: string; data: SheetData };

export type Workbook = { tabs: WorkbookTab[]; active: number };

export function parseSheet(raw: string): SheetData {
  try {
    const data = raw ? (JSON.parse(raw) as SheetData) : EMPTY_SHEET;
    return grow(data, data.cols || 16, Math.max(data.rows?.length || 0, 40));
  } catch {
    return EMPTY_SHEET;
  }
}

export function grow(data: SheetData, cols: number, rowCount: number): SheetData {
  const nextCols = Math.max(cols, 1);
  const rows = Array.from({ length: Math.max(rowCount, 1) }, (_, r) => {
    const row = data.rows[r] || [];
    return Array.from({ length: nextCols }, (_, c) => row[c] || '');
  });
  return { cols: nextCols, rows };
}

export function parseWorkbook(raw: string): Workbook {
  try {
    const data = raw ? (JSON.parse(raw) as { tabs?: Array<SheetData & { name?: string }>; active?: number }) : null;
    if (data?.tabs && Array.isArray(data.tabs)) {
      return {
        tabs: data.tabs.map((tab, index) => ({
          name: tab.name || `Sheet${index + 1}`,
          data: grow(tab, tab.cols || 16, Math.max(tab.rows?.length || 0, 40)),
        })),
        active: Math.min(Number(data.active) || 0, data.tabs.length - 1),
      };
    }
    return { tabs: [{ name: 'Sheet1', data: parseSheet(raw) }], active: 0 };
  } catch {
    return { tabs: [{ name: 'Sheet1', data: parseSheet('') }], active: 0 };
  }
}

export function serializeWorkbook(book: { tabs: { name: string; data: SheetData }[]; active: number }) {
  return JSON.stringify({
    active: book.active,
    tabs: book.tabs.map((tab) => ({ name: tab.name, ...tab.data })),
  });
}

export function colName(index: number) {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function cellAddress(row: number, col: number) {
  return `${colName(col)}${row + 1}`;
}

function parseAddress(value: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  const letters = match[1].toUpperCase();
  let col = 0;
  for (const char of letters) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }
  return { r: Number(match[2]) - 1, c: col - 1 };
}

export function rawValue(data: SheetData, r: number, c: number) {
  return data.rows[r]?.[c] || '';
}

function asNumber(value: string) {
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) && value.trim() !== '' ? n : null;
}

function rangeValues(data: SheetData, from: string, to: string) {
  const a = parseAddress(from);
  const b = parseAddress(to);
  if (!a || !b) {
    return [];
  }
  const values: number[] = [];
  for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r += 1) {
    for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c += 1) {
      const n = asNumber(displayValue(data, r, c, new Set()));
      if (n !== null) {
        values.push(n);
      }
    }
  }
  return values;
}

export function displayValue(data: SheetData, r: number, c: number, seen: Set<string>): string {
  const raw = rawValue(data, r, c);
  if (!raw.startsWith('=')) {
    return raw;
  }
  const key = `${r}:${c}`;
  if (seen.has(key)) {
    return '#REF!';
  }
  seen.add(key);
  const expr = raw.slice(1).trim();
  const sum = /^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/i.exec(expr);
  if (sum) {
    return String(rangeValues(data, sum[1], sum[2]).reduce((a, b) => a + b, 0));
  }
  const avg = /^AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)$/i.exec(expr);
  if (avg) {
    const values = rangeValues(data, avg[1], avg[2]);
    return values.length ? String(values.reduce((a, b) => a + b, 0) / values.length) : '0';
  }
  const resolved = expr.replace(/[A-Z]+\d+/gi, (token) => {
    const pos = parseAddress(token);
    if (!pos) {
      return '0';
    }
    return displayValue(data, pos.r, pos.c, seen) || '0';
  });
  if (!/^[-+*/().\d\s]+$/.test(resolved)) {
    return '#ERR';
  }
  try {
    const value = Function(`"use strict"; return (${resolved})`)();
    return value === undefined || Number.isNaN(value) ? '#ERR' : String(value);
  } catch {
    return '#ERR';
  }
}
