import type { ReactNode } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { Dropdown, type MenuProps } from 'antd';
import type { ConversationLabel, Room } from '@/types';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { isRoomMuted, MUTE_OPTIONS } from '../utils/rooms';

export function RoomMenu({
  room,
  actions,
  children,
  trigger,
  labels = [],
  onManageLabels,
}: {
  room: Room;
  actions: ReturnType<typeof useRoomPrefs>;
  children: ReactNode;
  trigger: ('click' | 'contextMenu')[];
  labels?: ConversationLabel[];
  onManageLabels?: () => void;
}) {
  const muted = isRoomMuted(room);
  const hasUnread = (room.unreadCount ?? 0) > 0 || (room.markedUnread ?? false);

  const labelMenuItems: MenuProps['items'] = [
    ...labels.map((l) => ({
      key: `label-${l.id}`,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          <span className="room-label-dot" style={{ background: l.color }} />
          <span style={{ flex: 1 }}>{l.name}</span>
          {room.labelId === l.id ? <CheckOutlined style={{ color: '#0084ff', fontSize: 12 }} /> : null}
        </span>
      ),
      onClick: () => actions.setLabel(room, l.id),
    })),
    ...(room.labelId
      ? [
          {
            key: 'unlabel',
            label: 'Bỏ phân loại',
            onClick: () => actions.setLabel(room, null),
          },
        ]
      : []),
    ...(labels.length > 0 || room.labelId ? [{ type: 'divider' as const }] : []),
    {
      key: 'manage-labels',
      label: 'Quản lý nhãn…',
      onClick: () => onManageLabels?.(),
    },
  ];

  // Cloud của tôi luôn ghim đầu, không cho bỏ ghim hay ẩn
  const items: MenuProps['items'] = [
    ...(room.isCloud
      ? []
      : [
          {
            key: 'pin',
            label: room.pinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại',
            onClick: () => actions.togglePin(room),
          },
        ]),
    {
      key: 'unread',
      label: hasUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc',
      onClick: () => actions.toggleUnread(room),
    },
    {
      key: 'classify',
      label: 'Phân loại',
      children: labelMenuItems,
    },
    muted
      ? {
          key: 'unmute',
          label: 'Bật thông báo',
          onClick: () => actions.unmute(room),
        }
      : {
          key: 'mute',
          label: 'Tắt thông báo',
          children: MUTE_OPTIONS.map((opt) => ({
            key: `mute-${opt.minutes ?? 'forever'}`,
            label: opt.label,
            onClick: () => actions.mute(room, opt.minutes),
          })),
        },
    ...(room.isCloud
      ? []
      : [
          { type: 'divider' as const },
          {
            key: 'hide',
            label: 'Ẩn trò chuyện',
            onClick: () => actions.hide(room),
          },
        ]),
  ];

  return (
    <Dropdown menu={{ items }} trigger={trigger}>
      {children}
    </Dropdown>
  );
}
