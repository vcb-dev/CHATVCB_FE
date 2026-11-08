import { Avatar } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { TaskPerson } from '@/types';

export function PersonAvatar({ person, size }: { person: TaskPerson; size: number }) {
  return (
    <Avatar
      size={size}
      className="task-person-avatar"
      src={person.avatarUrl ? fileSrc(person.avatarUrl) : undefined}
      style={{ background: avatarColor(person.name), fontSize: Math.max(8, size * 0.45) }}
    >
      {initials(person.name)}
    </Avatar>
  );
}
