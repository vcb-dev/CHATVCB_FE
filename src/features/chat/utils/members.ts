import type { GroupRole, RoomMember } from '@/types';
import { foldText } from '@/lib/text';

const ROLE_ORDER: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };

/** Trưởng nhóm đầu tiên, rồi phó nhóm, rồi thành viên; cùng vai trò giữ thứ tự BE trả (theo tên). */
export function sortByRole(members: RoomMember[]): RoomMember[] {
  return [...members].sort((a, b) => ROLE_ORDER[a.role ?? 'member'] - ROLE_ORDER[b.role ?? 'member']);
}

/** Khớp tên, biệt danh hoặc @handle; chuỗi rỗng khớp tất cả. */
export function matchMember(member: RoomMember, query: string): boolean {
  const q = foldText(query.trim().replace(/^@/, ''));
  if (!q) {
    return true;
  }
  return [member.displayName, member.name, member.nickname, member.handle].some(
    (value) => value && foldText(value).includes(q),
  );
}
