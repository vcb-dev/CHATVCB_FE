import type { ReactNode } from 'react';
import { Dropdown, type MenuProps } from 'antd';
import type { Room } from '@/types';
import type { useRoomPrefs } from '../hooks/useRoomPrefs';
import { isRoomMuted, MUTE_OPTIONS } from '../utils/rooms';

export function RoomMenu({
  room,
  actions,
  children,
  trigger,
}: {
  room: Room;
  actions: ReturnType<typeof useRoomPrefs>;
  children: ReactNode;
  trigger: ('click' | 'contextMenu')[];
}) {
  const muted = isRoomMuted(room);
  const hasUnread = (room.unreadCount ?? 0) > 0 || (room.markedUnread ?? false);

  const items: MenuProps['items'] = [
    {
      key: 'pin',
      label: room.pinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại',
      onClick: () => actions.togglePin(room),
    },
    {
      key: 'unread',
      label: hasUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc',
      onClick: () => actions.toggleUnread(room),
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
    {
      type: 'divider',
    },
    {
      key: 'hide',
      label: 'Ẩn trò chuyện',
      onClick: () => actions.hide(room),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={trigger}>
      {children}
    </Dropdown>
  );
}
