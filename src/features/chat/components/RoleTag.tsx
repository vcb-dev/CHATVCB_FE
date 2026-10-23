import { Tag } from 'antd';
import type { GroupRole } from '@/types';

export function RoleTag({ role }: { role?: GroupRole }) {
  if (role === 'owner') {
    return <Tag color="gold" className="role-tag">Trưởng nhóm</Tag>;
  }
  if (role === 'admin') {
    return <Tag color="blue" className="role-tag">Phó nhóm</Tag>;
  }
  return null;
}
