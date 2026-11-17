import { Modal, Segmented } from 'antd';
import { useState, type ReactNode } from 'react';
import type { DocKind } from '@/types';
import { TEMPLATE_CARDS, TEMPLATE_GROUPS, type TemplateCard, type TemplateGroup } from '../utils/templates';

/** Trung tâm mẫu: lọc theo nhóm, bấm một mẫu là tạo tài liệu */
export function TemplateCenter(props: {
  open: boolean;
  kindIcon: (kind: DocKind) => ReactNode;
  onClose: () => void;
  onPick: (card: TemplateCard) => void;
}) {
  const [group, setGroup] = useState<TemplateGroup>('all');
  const cards = TEMPLATE_CARDS.filter((card) => group === 'all' || card.group === group);

  return (
    <Modal title="Trung tâm mẫu" open={props.open} footer={null} width={760} onCancel={props.onClose} destroyOnHidden>
      <Segmented
        className="docs-template-groups"
        value={group}
        onChange={(value) => setGroup(value as TemplateGroup)}
        options={TEMPLATE_GROUPS.map((item) => ({ value: item.key, label: item.label }))}
      />
      <div className="docs-template-grid">
        {cards.map((card) => (
          <button key={card.key} type="button" className="docs-quick-card" onClick={() => props.onPick(card)}>
            {props.kindIcon(card.kind)}
            <strong>{card.title}</strong>
            <small>{card.hint}</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}
