import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Input } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { EMPTY_SHEET, SheetEditor } from './SheetEditor';
import type { DocItem, DocKind } from '@/types';

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function useDocJson<T>(content: string, fallback: T) {
  const [data, setData] = useState(() => parse(content, fallback));
  const ready = useRef(Boolean(content));
  useEffect(() => {
    if (!ready.current && content) {
      setData(parse(content, fallback));
      ready.current = true;
    }
  }, [content, fallback]);
  return [data, setData] as const;
}

type Props = {
  doc: DocItem;
  onChange: (content: string) => void;
};

export function DocsEditor({ doc, onChange }: Props) {
  if (doc.kind === 'sheet') {
    return <SheetEditor content={doc.content} onChange={onChange} />;
  }
  if (doc.kind === 'slides') {
    return <SlidesEditor content={doc.content} onChange={onChange} />;
  }
  if (doc.kind === 'form') {
    return <FormEditor content={doc.content} onChange={onChange} />;
  }
  if (doc.kind === 'mind') {
    return <MindEditor content={doc.content} onChange={onChange} />;
  }
  if (doc.kind === 'board') {
    return <BoardEditor content={doc.content} onChange={onChange} />;
  }
  if (doc.kind === 'flow') {
    return <FlowEditor content={doc.content} onChange={onChange} />;
  }
  return <RichEditor docId={doc.id} content={doc.content} onChange={onChange} />;
}

function RichEditor({
  docId,
  content,
  onChange,
}: {
  docId: string;
  content: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (!ref.current.innerText.trim()) {
      ref.current.innerHTML = content || '<p></p>';
    }
  }, [docId, content]);
  return (
    <>
      <div className="docs-toolbar">
        <Button size="small" onClick={() => document.execCommand('formatBlock', false, 'h1')}>H1</Button>
        <Button size="small" onClick={() => document.execCommand('formatBlock', false, 'h2')}>H2</Button>
        <Button size="small" icon={<BoldOutlined />} onClick={() => document.execCommand('bold')} />
        <Button size="small" icon={<ItalicOutlined />} onClick={() => document.execCommand('italic')} />
        <Button size="small" icon={<UnorderedListOutlined />} onClick={() => document.execCommand('insertUnorderedList')} />
        <Button size="small" icon={<OrderedListOutlined />} onClick={() => document.execCommand('insertOrderedList')} />
      </div>
      <div
        ref={ref}
        className="docs-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Nhập để viết…"
        onInput={() => onChange(ref.current?.innerHTML || '')}
      />
    </>
  );
}

const EMPTY_SLIDES = { slides: [{ title: 'Trang 1', body: '' }] };

function SlidesEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  const [data, setData] = useDocJson(content, EMPTY_SLIDES);
  const slides = data.slides;
  function save(next: typeof slides) {
    setData({ slides: next });
    onChange(JSON.stringify({ slides: next }));
  }
  return (
    <div className="docs-slides">
      <aside>
        {slides.map((slide, i) => (
          <button key={i} type="button" className="docs-slide-thumb">
            {i + 1}. {slide.title || 'Trang'}
          </button>
        ))}
        <Button size="small" icon={<PlusOutlined />} onClick={() => save([...slides, { title: `Trang ${slides.length + 1}`, body: '' }])}>
          Thêm trang
        </Button>
      </aside>
      <div className="docs-slide-stage">
        {slides.map((slide, i) => (
          <article key={i}>
            <Input
              defaultValue={slide.title}
              variant="borderless"
              className="docs-title"
              onBlur={(event) => save(slides.map((item, idx) => (idx === i ? { ...item, title: event.target.value } : item)))}
            />
            <Input.TextArea
              defaultValue={slide.body}
              autoSize={{ minRows: 6 }}
              placeholder="Nội dung trang chiếu"
              onBlur={(event) => save(slides.map((item, idx) => (idx === i ? { ...item, body: event.target.value } : item)))}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = { fields: [{ id: '1', label: 'Câu hỏi 1', type: 'text' }] };

function FormEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  const [data, setData] = useDocJson(content, EMPTY_FORM);
  function save(fields: typeof data.fields) {
    setData({ fields });
    onChange(JSON.stringify({ fields }));
  }
  return (
    <div className="docs-form">
      {data.fields.map((field, i) => (
        <div key={field.id || i} className="docs-form-field">
          <Input
            defaultValue={field.label}
            onBlur={(event) => save(data.fields.map((item, idx) => (idx === i ? { ...item, label: event.target.value } : item)))}
          />
          <Input placeholder="Câu trả lời" disabled />
        </div>
      ))}
      <Button icon={<PlusOutlined />} onClick={() => save([...data.fields, { id: String(Date.now()), label: `Câu hỏi ${data.fields.length + 1}`, type: 'text' }])}>
        Thêm câu hỏi
      </Button>
    </div>
  );
}

type MindNode = { text: string; children: MindNode[] };

const EMPTY_MIND: MindNode = { text: 'Ý tưởng trung tâm', children: [] };

function MindEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  const [data, setData] = useDocJson<MindNode>(content, EMPTY_MIND);
  return (
    <div className="docs-mind">
      <MindBranch
        node={data}
        onChange={onChange}
        replace={(next) => {
          setData(next);
          onChange(JSON.stringify(next));
        }}
      />
    </div>
  );
}

function MindBranch({
  node,
  replace,
}: {
  node: MindNode;
  onChange: (value: string) => void;
  replace: (next: MindNode) => void;
}) {
  return (
    <div className="docs-mind-node">
      <Input
        defaultValue={node.text}
        onBlur={(event) => replace({ ...node, text: event.target.value })}
      />
      <button type="button" onClick={() => replace({ ...node, children: [...node.children, { text: '', children: [] }] })}>
        +
      </button>
      <div className="docs-mind-kids">
        {node.children.map((child, i) => (
          <MindBranch
            key={`${i}-${child.text}`}
            node={child}
            onChange={() => undefined}
            replace={(next) => replace({ ...node, children: node.children.map((item, idx) => (idx === i ? next : item)) })}
          />
        ))}
      </div>
    </div>
  );
}

const EMPTY_BOARD = { columns: [{ title: 'Cần làm', cards: [''] }] };

function BoardEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  const [data, setData] = useDocJson(content, EMPTY_BOARD);
  function save(columns: typeof data.columns) {
    setData({ columns });
    onChange(JSON.stringify({ columns }));
  }
  return (
    <div className="docs-board">
      {data.columns.map((col, i) => (
        <section key={i}>
          <Input
            defaultValue={col.title}
            variant="borderless"
            onBlur={(event) => save(data.columns.map((item, idx) => (idx === i ? { ...item, title: event.target.value } : item)))}
          />
          {col.cards.map((card, c) => (
            <Input
              key={`${i}-${c}`}
              defaultValue={card}
              onBlur={(event) =>
                save(data.columns.map((item, idx) => (
                  idx === i ? { ...item, cards: item.cards.map((value, vi) => (vi === c ? event.target.value : value)) } : item
                )))
              }
            />
          ))}
          <Button size="small" type="text" onClick={() => save(data.columns.map((item, idx) => (idx === i ? { ...item, cards: [...item.cards, ''] } : item)))}>
            + Thẻ
          </Button>
        </section>
      ))}
    </div>
  );
}

const EMPTY_FLOW = { steps: ['Bắt đầu'] };

function FlowEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  const [data, setData] = useDocJson(content, EMPTY_FLOW);
  return (
    <div className="docs-flow">
      {data.steps.map((step, i) => (
        <div key={i} className="docs-flow-step">
          <Input
            defaultValue={step}
            onBlur={(event) => onChange(JSON.stringify({ steps: data.steps.map((value, idx) => (idx === i ? event.target.value : value)) }))}
          />
          {i < data.steps.length - 1 ? <span>↓</span> : null}
        </div>
      ))}
      <Button icon={<PlusOutlined />} onClick={() => onChange(JSON.stringify({ steps: [...data.steps, `Bước ${data.steps.length + 1}`] }))}>
        Thêm bước
      </Button>
    </div>
  );
}

export function kindLabel(kind?: DocKind) {
  const labels: Record<DocKind, string> = {
    doc: 'Word',
    sheet: 'Google Sheet',
    slides: 'Trang chiếu',
    form: 'Biểu mẫu',
    mind: 'MindNotes',
    folder: 'Thư mục',
    board: 'Bảng',
    flow: 'Lưu đồ',
  };
  return labels[kind || 'doc'];
}

export function draftTitle(kind: DocKind, template?: string, title?: string) {
  if (title?.trim()) {
    return title.trim();
  }
  if (kind === 'sheet') {
    return 'Bảng tính không tiêu đề';
  }
  if (template === 'meeting') {
    return 'Biên bản họp';
  }
  if (template === 'weekly') {
    return 'Báo cáo tuần';
  }
  return 'Tài liệu không tiêu đề';
}

export function draftContent(kind: DocKind, template?: string, content?: string) {
  if (content) {
    return content;
  }
  if (kind === 'sheet') {
    return JSON.stringify(EMPTY_SHEET);
  }
  if (template === 'meeting') {
    return '<h2>Mục tiêu</h2><p></p><h2>Thành phần</h2><ul><li></li></ul><h2>Nội dung</h2><p></p><h2>Việc cần làm</h2><ul><li></li></ul>';
  }
  if (template === 'weekly') {
    return '<h2>Đã làm</h2><ul><li></li></ul><h2>Đang làm</h2><ul><li></li></ul><h2>Vướng mắc</h2><p></p><h2>Kế hoạch tuần sau</h2><ul><li></li></ul>';
  }
  return '';
}
