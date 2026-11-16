import { AppstoreOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import type { DocItem, DocKind } from '@/types';
import { TEMPLATE_CARDS, type TemplateCard } from '../utils/templates';

const QUICK = ['blank', 'sheet', 'meeting', 'weekly'];

function when(value: string) {
  return new Date(value).toLocaleString('vi-VN', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Trang chủ Docs: tạo nhanh, tài liệu gần đây, ưa thích (giống trang chủ Lark Docs) */
export function DocsHome(props: {
  recent: DocItem[];
  starred: DocItem[];
  loaded: boolean;
  kindIcon: (kind: DocKind) => ReactNode;
  onOpen: (item: DocItem) => void;
  onCreate: (card: TemplateCard) => void;
  onShowTemplates: () => void;
  onSeeAll: (tab: 'recent' | 'starred') => void;
}) {
  const quick = QUICK.map((key) => TEMPLATE_CARDS.find((card) => card.key === key)!).filter(Boolean);

  const grid = (items: DocItem[]) => (
    <div className="docs-grid">
      {items.map((item) => (
        <button key={item.id} type="button" className="docs-grid-card" onClick={() => props.onOpen(item)}>
          {props.kindIcon(item.kind)}
          <strong title={item.title}>{item.title || 'Không tiêu đề'}</strong>
          <small>
            {item.owner.name} · {when(item.updatedAt)}
          </small>
        </button>
      ))}
    </div>
  );

  return (
    <div className="docs-home">
      <section>
        <h3>Tạo nhanh</h3>
        <div className="docs-quick">
          {quick.map((card) => (
            <button key={card.key} type="button" className="docs-quick-card" onClick={() => props.onCreate(card)}>
              {props.kindIcon(card.kind)}
              <strong>{card.title}</strong>
              <small>{card.hint}</small>
            </button>
          ))}
          <button type="button" className="docs-quick-card more" onClick={props.onShowTemplates}>
            <span className="docs-kind gold">
              <AppstoreOutlined />
            </span>
            <strong>Tất cả mẫu</strong>
            <small>Kế hoạch, đề xuất, bàn giao…</small>
          </button>
        </div>
      </section>
      <section>
        <div className="docs-home-head">
          <h3>Gần đây</h3>
          {props.recent.length ? (
            <Button type="link" size="small" onClick={() => props.onSeeAll('recent')}>
              Xem tất cả
            </Button>
          ) : null}
        </div>
        {props.recent.length ? (
          grid(props.recent)
        ) : props.loaded ? (
          <p className="docs-home-empty">Chưa có tài liệu nào. Tạo tài liệu đầu tiên ở trên.</p>
        ) : null}
      </section>
      {props.starred.length ? (
        <section>
          <div className="docs-home-head">
            <h3>Ưa thích</h3>
            <Button type="link" size="small" onClick={() => props.onSeeAll('starred')}>
              Xem tất cả
            </Button>
          </div>
          {grid(props.starred)}
        </section>
      ) : null}
    </div>
  );
}
