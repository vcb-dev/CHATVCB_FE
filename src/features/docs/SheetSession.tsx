import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  FunctionOutlined,
  HomeOutlined,
  ItalicOutlined,
  MoreOutlined,
  PlusOutlined,
  RedoOutlined,
  SearchOutlined,
  ShareAltOutlined,
  UnderlineOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { draftContent, draftTitle } from './utils/drafts';
import { EMPTY_SHEET, parseWorkbook, serializeWorkbook } from './utils/workbook';
import { SheetEditor, type SheetHandle } from './SheetEditor';
import { draftKey, parseSheetHash, sheetTabUrl } from './sheet';
import { avatarColor, initials } from '@/lib/avatar';
import type { DocItem, User } from '@/types';

type Props = { user: User };

export function SheetSession({ user }: Props) {
  const route = parseSheetHash();
  const sheetRef = useRef<SheetHandle>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [doc, setDoc] = useState<DocItem | null>(null);
  const [title, setTitle] = useState(draftTitle('sheet'));
  const [saving, setSaving] = useState('Đang mở…');
  const [book, setBook] = useState(() => parseWorkbook(draftContent('sheet')));

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        if (route?.id) {
          const next = await api.getDoc(route.id);
          if (cancelled) {
            return;
          }
          setDoc(next);
          setTitle(next.title);
          setBook(parseWorkbook(next.content));
          setSaving('Đã lưu');
          document.title = next.title;
          if (next.googleUrl) {
            window.location.replace(next.googleUrl);
          }
          return;
        }
        if (route?.draft) {
          const raw = sessionStorage.getItem(draftKey(route.draft));
          const draft = raw ? (JSON.parse(raw) as { title?: string; content?: string }) : {};
          setTitle(draft.title || draftTitle('sheet'));
          setBook(parseWorkbook(draft.content || draftContent('sheet')));
          setSaving('Đang tạo…');
          const created = await api.createDoc({
            kind: 'sheet',
            title: draft.title || draftTitle('sheet'),
            content: draft.content || serializeWorkbook(parseWorkbook(draft.content || draftContent('sheet'))),
          });
          if (cancelled) {
            return;
          }
          sessionStorage.removeItem(draftKey(route.draft));
          setDoc(created);
          setSaving('Đã lưu');
          document.title = created.title;
          if (created.googleUrl) {
            window.location.replace(created.googleUrl);
            return;
          }
          window.history.replaceState({}, '', sheetTabUrl({ id: created.id }));
          return;
        }
        const created = await api.createDoc({ kind: 'sheet' });
        if (cancelled) {
          return;
        }
        setDoc(created);
        setTitle(created.title);
        setBook(parseWorkbook(created.content));
        setSaving('Đã lưu');
        document.title = created.title;
        if (created.googleUrl) {
          window.location.replace(created.googleUrl);
          return;
        }
        window.history.replaceState({}, '', sheetTabUrl({ id: created.id }));
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Không mở được bảng tính.');
        setSaving('Lỗi');
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [route?.id, route?.draft]);

  function queue(next: { title?: string; content?: string }) {
    if (!doc) {
      return;
    }
    window.clearTimeout(saveTimer.current);
    setSaving('Đang lưu…');
    saveTimer.current = window.setTimeout(() => {
      void api
        .updateDoc(doc.id, next)
        .then(() => setSaving('Đã lưu'))
        .catch(() => setSaving('Lưu lỗi'));
    }, 400);
  }

  function saveBook(next: typeof book) {
    setBook(next);
    queue({ content: serializeWorkbook(next) });
  }

  const active = book.tabs[book.active] || book.tabs[0];

  return (
    <div className="gs-app">
      <header className="gs-top">
        <button type="button" className="gs-home" onClick={() => { window.location.hash = ''; }}>
          <HomeOutlined />
        </button>
        <div className="gs-top-main">
          <Input
            className="gs-title"
            variant="borderless"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              document.title = event.target.value || 'Bảng tính';
              queue({ title: event.target.value });
            }}
          />
          <small>{user.name} · {saving}</small>
        </div>
        <Button type="primary" icon={<ShareAltOutlined />} onClick={() => {
          void navigator.clipboard.writeText(window.location.href);
          message.success('Đã copy link bảng tính.');
        }}>
          Chia sẻ
        </Button>
        <Button type="text" icon={<MoreOutlined />} />
        <Button type="text" icon={<SearchOutlined />} />
        <Avatar size={32} style={{ background: avatarColor(user.name) }}>{initials(user.name)}</Avatar>
      </header>
      <div className="gs-sheets">
        {book.tabs.map((tab, index) => (
          <button
            key={`${tab.name}-${index}`}
            type="button"
            className={index === book.active ? 'on' : ''}
            onClick={() => saveBook({ ...book, active: index })}
          >
            {tab.name}
          </button>
        ))}
        <button
          type="button"
          className="gs-add"
          onClick={() => saveBook({
            ...book,
            tabs: [...book.tabs, { name: `Sheet${book.tabs.length + 1}`, data: { ...EMPTY_SHEET, rows: EMPTY_SHEET.rows.map((row) => [...row]) } }],
            active: book.tabs.length,
          })}
        >
          <PlusOutlined />
        </button>
      </div>
      <div className="gs-tools">
        <button type="button" onClick={() => sheetRef.current?.undo()}><UndoOutlined /></button>
        <button type="button" onClick={() => sheetRef.current?.redo()}><RedoOutlined /></button>
        <span className="gs-sep" />
        <select defaultValue="Arial" onChange={() => undefined}>
          <option>Arial</option>
          <option>Calibri</option>
          <option>Times New Roman</option>
        </select>
        <select
          defaultValue="10"
          onChange={(event) => sheetRef.current?.format({ size: Number(event.target.value) })}
        >
          {[10, 11, 12, 14, 16, 18, 24].map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
        <button type="button" onClick={() => sheetRef.current?.format({ b: true })}><BoldOutlined /></button>
        <button type="button" onClick={() => sheetRef.current?.format({ i: true })}><ItalicOutlined /></button>
        <button type="button" onClick={() => sheetRef.current?.format({ u: true })}><UnderlineOutlined /></button>
        <span className="gs-sep" />
        <button type="button" onClick={() => sheetRef.current?.format({ align: 'left' })}><AlignLeftOutlined /></button>
        <button type="button" onClick={() => sheetRef.current?.format({ align: 'center' })}><AlignCenterOutlined /></button>
        <button type="button" onClick={() => sheetRef.current?.format({ align: 'right' })}><AlignRightOutlined /></button>
        <span className="gs-sep" />
        <button type="button"><FunctionOutlined /> fx</button>
      </div>
      <SheetEditor
        ref={sheetRef}
        embedded
        content={JSON.stringify(active.data)}
        onChange={(value) => {
          const data = JSON.parse(value) as (typeof book.tabs)[0]['data'];
          saveBook({
            ...book,
            tabs: book.tabs.map((tab, index) => (index === book.active ? { ...tab, data } : tab)),
          });
        }}
      />
    </div>
  );
}
