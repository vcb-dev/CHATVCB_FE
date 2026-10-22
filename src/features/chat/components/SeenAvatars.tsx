import { Avatar } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { RoomRead } from '@/types';

export function SeenAvatars({ readers }: { readers: RoomRead[] }) {
  if (!readers.length) {
    return null;
  }
  const shown = readers.slice(0, 5);
  const extra = readers.length - shown.length;
  return (
    <div className="seen-row">
      {shown.map((item) => (
        <span key={item.userId} title={item.name}>
          <Avatar
            size={16}
            className="avatar-initials"
            src={item.avatarUrl ? fileSrc(item.avatarUrl) : undefined}
            style={{ background: avatarColor(item.name) }}
          >
            {initials(item.name)}
          </Avatar>
        </span>
      ))}
      {extra > 0 ? <span className="seen-extra">+{extra}</span> : null}
    </div>
  );
}
