import type { DirectoryUser } from '@/types';

export type ContactGroup = {
  letter: string;
  users: DirectoryUser[];
};

/** "sale" -> "Sale"; team lưu chữ thường trong DB. */
export function teamLabel(team: string): string {
  return team ? team.charAt(0).toUpperCase() + team.slice(1) : team;
}

/** Chữ cái đầu để gom nhóm A-Z; bỏ dấu tiếng Việt (Đ -> D), ký tự lạ rơi vào "#". */
function letterOf(name: string): string {
  const first = name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/** Gom theo chữ cái, A-Z trước và "#" cuối; trong nhóm xếp theo tên (chuẩn tiếng Việt). */
export function groupByLetter(users: DirectoryUser[]): ContactGroup[] {
  const buckets = new Map<string, DirectoryUser[]>();
  for (const user of users) {
    const letter = letterOf(user.name);
    const bucket = buckets.get(letter);
    if (bucket) {
      bucket.push(user);
    } else {
      buckets.set(letter, [user]);
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === '#' || b === '#') {
        return a === '#' ? 1 : -1;
      }
      return a.localeCompare(b);
    })
    .map(([letter, items]) => ({
      letter,
      users: [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    }));
}
