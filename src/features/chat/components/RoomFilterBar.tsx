import { DownOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { ConversationLabel, Room } from '@/types';
import { isDirectRoom } from '../utils/rooms';

export type RoomFilter =
  | { kind: 'all' }
  | { kind: 'unread' }
  | { kind: 'group' }
  | { kind: 'direct' }
  | { kind: 'label'; labelId: string };

const CHIPS: { kind: 'all' | 'unread' | 'group' | 'direct'; text: string }[] = [
  { kind: 'all', text: 'Tất cả' },
  { kind: 'unread', text: 'Chưa đọc' },
  { kind: 'group', text: 'Nhóm' },
  { kind: 'direct', text: 'Nhắn riêng' },
];

function matchesFilter(room: Room, filter: RoomFilter): boolean {
  switch (filter.kind) {
    case 'unread':
      return room.unreadCount > 0 || (room.markedUnread ?? false);
    case 'group':
      return !isDirectRoom(room);
    case 'direct':
      return isDirectRoom(room);
    case 'label':
      return room.labelId === filter.labelId;
    default:
      return true;
  }
}

// Cloud của tôi luôn hiện ở đầu danh sách, không bộ lọc nào ẩn nó đi
export function filterRooms(rooms: Room[], filter: RoomFilter): Room[] {
  if (filter.kind === 'all') {
    return rooms;
  }
  return rooms.filter((r) => r.isCloud || matchesFilter(r, filter));
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
      {CHIPS.map((chip) => (
        <button
          key={chip.kind}
          type="button"
          className={['room-filter-chip', filter.kind === chip.kind ? 'active' : ''].filter(Boolean).join(' ')}
          onClick={() => onChange({ kind: chip.kind })}
        >
          {chip.text}
        </button>
      ))}
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
