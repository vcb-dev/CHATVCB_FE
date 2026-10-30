import type { GroupRole, RoomMember } from '@/types';

const ROLE_ORDER: Record<GroupRole, number> = { owner: 0, admin: 1, member: 2 };

/** Trưởng nhóm đầu tiên, rồi phó nhóm, rồi thành viên; cùng vai trò giữ thứ tự BE trả (theo tên). */
export function sortByRole(members: RoomMember[]): RoomMember[] {
  return [...members].sort((a, b) => ROLE_ORDER[a.role ?? 'member'] - ROLE_ORDER[b.role ?? 'member']);
}

/** Bỏ dấu tiếng Việt (Đ -> d) và viết thường, để gõ "binh" vẫn ra "Bình". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/** Khớp tên, biệt danh hoặc @handle; chuỗi rỗng khớp tất cả. */
export function matchMember(member: RoomMember, query: string): boolean {
  const q = fold(query.trim().replace(/^@/, ''));
  if (!q) {
    return true;
  }
  return [member.displayName, member.name, member.nickname, member.handle].some(
    (value) => value && fold(value).includes(q),
  );
}
