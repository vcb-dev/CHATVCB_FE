import { Avatar, Popover } from 'antd';
import type { ReactNode } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { RoomRead } from '@/types';

function SeenNames({ viewers }: { viewers: RoomRead[] }) {
  if (!viewers.length) {
    return <div className="seen-names">Chưa có ai xem</div>;
  }
  return (
    <ul className="seen-names">
      {viewers.map((item) => (
        <li key={item.userId}>
          <Avatar
            size={22}
            className="avatar-initials"
            src={item.avatarUrl ? fileSrc(item.avatarUrl) : undefined}
            style={{ background: avatarColor(item.name) }}
          >
            {initials(item.name)}
          </Avatar>
          <span>{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function SeenBubble({
  viewers,
  disabled,
  children,
}: {
  viewers: RoomRead[];
  /** Tin của mình trong nhóm dùng vòng "đã đọc" riêng, không mở hộp "Đã xem" khi bấm vào bong bóng. */
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return <>{children}</>;
  }
  return (
    <Popover
      trigger="click"
      title={`Đã xem${viewers.length ? ` · ${viewers.length}` : ''}`}
      content={<SeenNames viewers={viewers} />}
    >
      {children}
    </Popover>
  );
}
