import type { Room } from '@/types';
import { foldText } from '@/lib/text';
import { isDirectRoom } from '@/features/chat/utils/rooms';

function nameOf(room: Room): string {
  return room.title || room.name;
}

/**
 * Tab "Nhóm" của Danh bạ: các nhóm đang tham gia (bỏ phòng 1-1 và phòng đã ẩn),
 * Cloud của tôi luôn có và đứng đầu như ở danh sách chat, còn lại xếp theo tên.
 */
export function contactGroups(rooms: Room[], query: string): Room[] {
  const needle = foldText(query.trim());
  return rooms
    .filter((room) => room.isCloud || (!isDirectRoom(room) && !room.hidden))
    .filter((room) => !needle || foldText(nameOf(room)).includes(needle))
    .sort((a, b) => {
      if (Boolean(a.isCloud) !== Boolean(b.isCloud)) {
        return a.isCloud ? -1 : 1;
      }
      return nameOf(a).localeCompare(nameOf(b), 'vi');
    });
}
