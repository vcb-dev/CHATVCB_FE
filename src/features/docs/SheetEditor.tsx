import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { cellAddress, colName, displayValue, grow, parseSheet, rawValue, type CellStyle, type SheetData } from './utils/workbook';

export type SheetHandle = {
  undo: () => void;
  redo: () => void;
  format: (patch: CellStyle) => void;
  address: () => string;
};

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
