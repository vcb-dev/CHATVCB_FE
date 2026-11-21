import { UserAvatar } from '@/components/UserAvatar';
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
          <UserAvatar
            size={16}
            className="avatar-initials"
            src={item.avatarUrl}
            name={item.name}
            zoomable={false}
          />
        </span>
      ))}
      {extra > 0 ? <span className="seen-extra">+{extra}</span> : null}
    </div>
  );
}
