import { DownOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { ConversationLabel } from '@/types';
import type { RoomFilter } from '../utils/rooms';

export function RoomFilterBar(props: {
  filter: RoomFilter;
  labels: ConversationLabel[];
  onChange: (f: RoomFilter) => void;
  onManage: () => void;
}) {
  const { filter, labels, onChange, onManage } = props;

  let moreLabel = 'Phân loại';
  let isMoreActive = false;
  if (filter.kind === 'group') {
    moreLabel = 'Nhóm';
    isMoreActive = true;
  } else if (filter.kind === 'direct') {
    moreLabel = 'Nhắn riêng';
    isMoreActive = true;
  } else if (filter.kind === 'label') {
    const activeLabel = labels.find((l) => l.id === filter.labelId);
    moreLabel = activeLabel?.name ?? 'Phân loại';
    isMoreActive = true;
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'group',
      label: 'Nhóm',
      onClick: () => onChange({ kind: 'group' }),
    },
    {
      key: 'direct',
      label: 'Nhắn riêng',
      onClick: () => onChange({ kind: 'direct' }),
    },
    {
      type: 'divider',
    },
    ...labels.map((l) => ({
      key: l.id,
      label: (
        <span className="label-dropdown-item">
          <span className="room-label-dot" style={{ background: l.color }} />
          <span>{l.name}</span>
        </span>
      ),
      onClick: () => onChange({ kind: 'label', labelId: l.id }),
    })),
    ...(labels.length > 0 ? [{ type: 'divider' as const }] : []),
    {
      key: 'manage',
      label: 'Quản lý nhãn…',
      onClick: onManage,
    },
  ];

  return (
    <div className="room-filter-bar">
      <div className="room-filter-tabs">
        <button
          type="button"
          className={`room-filter-tab${filter.kind === 'all' ? ' active' : ''}`}
          onClick={() => onChange({ kind: 'all' })}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`room-filter-tab${filter.kind === 'unread' ? ' active' : ''}`}
          onClick={() => onChange({ kind: 'unread' })}
        >
          Chưa đọc
        </button>
      </div>

      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <button
          type="button"
          className={`room-filter-more${isMoreActive ? ' active' : ''}`}
        >
          <span>{moreLabel}</span>
          <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
        </button>
      </Dropdown>
    </div>
  );
}
