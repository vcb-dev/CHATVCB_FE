import { DownOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { ConversationLabel, Room } from '@/types';

export type RoomFilter =
  | { kind: 'all' }
  | { kind: 'unread' }
  | { kind: 'label'; labelId: string };

export function filterRooms(rooms: Room[], filter: RoomFilter): Room[] {
  if (filter.kind === 'unread') {
    return rooms.filter((r) => r.unreadCount > 0 || (r.markedUnread ?? false));
  }
  if (filter.kind === 'label') {
    return rooms.filter((r) => r.labelId === filter.labelId);
  }
  return rooms;
}

export function RoomFilterBar(props: {
  filter: RoomFilter;
  labels: ConversationLabel[];
  onChange: (f: RoomFilter) => void;
  onManage: () => void;
}) {
  const { filter, labels, onChange, onManage } = props;

  const activeLabel =
    filter.kind === 'label' ? labels.find((l) => l.id === filter.labelId) : null;

  const menuItems: MenuProps['items'] = [
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
      <button
        type="button"
        className={['room-filter-chip', filter.kind === 'all' ? 'active' : ''].filter(Boolean).join(' ')}
        onClick={() => onChange({ kind: 'all' })}
      >
        Tất cả
      </button>
      <button
        type="button"
        className={['room-filter-chip', filter.kind === 'unread' ? 'active' : ''].filter(Boolean).join(' ')}
        onClick={() => onChange({ kind: 'unread' })}
      >
        Chưa đọc
      </button>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <button
          type="button"
          className={['room-filter-chip', filter.kind === 'label' ? 'active' : ''].filter(Boolean).join(' ')}
        >
          {activeLabel ? (
            <span className="label-dropdown-item">
              <span className="room-label-dot" style={{ background: activeLabel.color }} />
              <span>{activeLabel.name}</span>
            </span>
          ) : (
            'Phân loại'
          )}
          <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
        </button>
      </Dropdown>
    </div>
  );
}
