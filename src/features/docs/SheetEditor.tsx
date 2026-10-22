import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react';

export const EMPTY_SHEET = {
  cols: 16,
  rows: Array.from({ length: 40 }, () => Array.from({ length: 16 }, () => '')),
};

type CellStyle = { b?: boolean; i?: boolean; u?: boolean; color?: string; bg?: string; size?: number; align?: 'left' | 'center' | 'right' };
type SheetData = { cols: number; rows: string[][]; styles?: Record<string, CellStyle> };
export type WorkbookTab = { name: string; data: SheetData };
export type Workbook = { tabs: WorkbookTab[]; active: number };

export type SheetHandle = {
  undo: () => void;
  redo: () => void;
  format: (patch: CellStyle) => void;
  address: () => string;
};

function parseSheet(raw: string): SheetData {
  try {
    const data = raw ? (JSON.parse(raw) as SheetData) : EMPTY_SHEET;
    return grow(data, data.cols || 16, Math.max(data.rows?.length || 0, 40));
  } catch {
    return EMPTY_SHEET;
  }
}

function grow(data: SheetData, cols: number, rowCount: number): SheetData {
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

function cellAddress(row: number, col: number) {
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

function rawValue(data: SheetData, r: number, c: number) {
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

function displayValue(data: SheetData, r: number, c: number, seen: Set<string>): string {
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

type Props = {
  content: string;
  onChange: (value: string) => void;
  embedded?: boolean;
};

export const SheetEditor = forwardRef<SheetHandle, Props>(function SheetEditor({ content, onChange, embedded }, ref) {
  const [data, setData] = useState(() => parseSheet(content));
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ready = useRef(Boolean(content));
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const past = useRef<SheetData[]>([]);
  const future = useRef<SheetData[]>([]);

  useEffect(() => {
    if (!ready.current && content) {
      setData(parseSheet(content));
      ready.current = true;
    }
  }, [content]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      wrapRef.current?.focus();
    }
  }, [editing, sel]);

  const current = rawValue(data, sel.r, sel.c);
  const shown = useMemo(() => displayValue(data, sel.r, sel.c, new Set()), [data, sel]);

  function commit(next: SheetData) {
    past.current.push(data);
    if (past.current.length > 40) {
      past.current.shift();
    }
    future.current = [];
    setData(next);
    onChange(JSON.stringify(next));
  }

  function undo() {
    const prev = past.current.pop();
    if (!prev) {
      return;
    }
    future.current.push(data);
    setData(prev);
    onChange(JSON.stringify(prev));
  }

  function redo() {
    const next = future.current.pop();
    if (!next) {
      return;
    }
    past.current.push(data);
    setData(next);
    onChange(JSON.stringify(next));
  }

  function format(patch: CellStyle) {
    const key = `${sel.r}:${sel.c}`;
    const currentStyle = data.styles?.[key] || {};
    const nextStyle = { ...currentStyle, ...patch };
    commit({ ...data, styles: { ...data.styles, [key]: nextStyle } });
  }

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    format,
    address: () => cellAddress(sel.r, sel.c),
  }));

  function write(r: number, c: number, value: string) {
    commit({
      cols: data.cols,
      rows: data.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)),
    });
  }

  function move(r: number, c: number) {
    setSel({
      r: Math.max(0, Math.min(data.rows.length - 1, r)),
      c: Math.max(0, Math.min(data.cols - 1, c)),
    });
  }

  function startEdit(value = current) {
    setDraft(value);
    setEditing(true);
  }

  function finishEdit(save = true, next?: { r: number; c: number }) {
    if (save && editing) {
      write(sel.r, sel.c, draft);
    }
    setEditing(false);
    if (next) {
      move(next.r, next.c);
    }
  }

  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    if (editing) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      startEdit();
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      startEdit();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      write(sel.r, sel.c, '');
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      move(sel.r, sel.c + (event.shiftKey ? -1 : 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(sel.r - 1, sel.c);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(sel.r + 1, sel.c);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(sel.r, sel.c - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(sel.r, sel.c + 1);
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      format({ b: !data.styles?.[`${sel.r}:${sel.c}`]?.b });
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      startEdit(event.key);
    }
  }

  function onEditKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(true, { r: sel.r + (event.shiftKey ? -1 : 1), c: sel.c });
    } else if (event.key === 'Tab') {
      event.preventDefault();
      finishEdit(true, { r: sel.r, c: sel.c + (event.shiftKey ? -1 : 1) });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(false);
    }
  }

  function onCopy(event: ClipboardEvent<HTMLDivElement>) {
    if (editing) {
      return;
    }
    event.preventDefault();
    event.clipboardData.setData('text/plain', current);
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain');
    if (!text) {
      return;
    }
    event.preventDefault();
    const block = text.replace(/\r/g, '').split('\n').filter((line, i, all) => line.length || i < all.length - 1).map((line) => line.split('\t'));
    const extraCols = sel.c + Math.max(...block.map((row) => row.length)) - data.cols;
    const extraRows = sel.r + block.length - data.rows.length;
    const next = grow(data, data.cols + Math.max(0, extraCols), data.rows.length + Math.max(0, extraRows));
    block.forEach((row, i) => {
      row.forEach((cell, j) => {
        next.rows[sel.r + i][sel.c + j] = cell;
      });
    });
    setEditing(false);
    commit(next);
  }

  function addRows() {
    commit(grow(data, data.cols, data.rows.length + 20));
  }

  function addCols() {
    commit(grow(data, data.cols + 5, data.rows.length));
  }

  function clickCell(r: number, c: number, event: MouseEvent) {
    if (editing) {
      finishEdit(true);
    }
    setSel({ r, c });
    if (event.detail >= 2) {
      startEdit();
    }
  }

  return (
    <div className="sheet-app">
      <div className="sheet-bar">
        <span className="sheet-addr">{cellAddress(sel.r, sel.c)}</span>
        <input
          className="sheet-fx"
          value={editing ? draft : current}
          placeholder="Nhập giá trị hoặc =SUM(A1:A10)"
          onFocus={() => startEdit()}
          onChange={(event) => {
            setDraft(event.target.value);
            if (!editing) {
              setEditing(true);
            }
          }}
          onKeyDown={onEditKey}
          onBlur={() => editing && finishEdit(true)}
        />
        {embedded ? null : (
          <>
            <button type="button" onClick={addRows}>+ 20 hàng</button>
            <button type="button" onClick={addCols}>+ 5 cột</button>
          </>
        )}
      </div>
      <div
        ref={wrapRef}
        className="sheet-grid-wrap"
        tabIndex={0}
        onKeyDown={onGridKey}
        onCopy={onCopy}
        onPaste={onPaste}
      >
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-corner" />
              {Array.from({ length: data.cols }, (_, c) => (
                <th key={c} className={sel.c === c ? 'on' : ''}>{colName(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={r}>
                <th className={sel.r === r ? 'on' : ''}>{r + 1}</th>
                {row.map((cell, c) => {
                  const active = sel.r === r && sel.c === c;
                  const value = displayValue(data, r, c, new Set());
                  const style = data.styles?.[`${r}:${c}`];
                  return (
                    <td
                      key={c}
                      className={active ? 'sel' : ''}
                      onMouseDown={(event) => clickCell(r, c, event)}
                    >
                      {active && editing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={() => finishEdit(true)}
                        />
                      ) : (
                        <span
                          className={cell.startsWith('=') ? 'fx' : ''}
                          style={{
                            fontWeight: style?.b ? 700 : 400,
                            fontStyle: style?.i ? 'italic' : 'normal',
                            textDecoration: style?.u ? 'underline' : 'none',
                            color: style?.color,
                            background: style?.bg,
                            fontSize: style?.size ? `${style.size}px` : undefined,
                            textAlign: style?.align,
                          }}
                        >
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
