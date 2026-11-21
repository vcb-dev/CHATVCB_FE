import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { PickTarget } from '@/components/ConversationPicker';
import type { Room } from '@/types';
import { foldText } from './text';
import { useDebouncedValue } from './useDebouncedValue';

/** Nơi gửi: phòng đã có, hoặc một người chưa có phòng 1-1 (tạo lúc gửi) */
export type ConversationTarget = PickTarget & { roomId?: string; userId?: string };

export function roomTarget(room: Pick<Room, 'id' | 'title' | 'name' | 'avatarUrl'>): ConversationTarget {
  return { key: room.id, roomId: room.id, name: room.title || room.name, avatarUrl: room.avatarUrl };
}

/** Phòng của đích; người chưa có phòng 1-1 thì tạo (BE tìm-hoặc-tạo nên gọi lại không ra phòng trùng). */
export async function targetRoomId(target: ConversationTarget): Promise<string> {
  return target.roomId ?? (await api.createDirectRoom(target.userId!)).id;
}

/**
 * Danh sách đích cho ConversationPicker: lọc không dấu trên các phòng đã tải;
 * gõ tìm thì hỏi thêm BE, vì danh sách tải sẵn chỉ có các trang gần nhất (BE trả tối đa 50 phòng mỗi lần).
 */
export function useConversationTargets(loaded: Room[], query: string, enabled: boolean) {
  const search = useDebouncedValue(query.trim(), 300);
  const found = useQuery({
    queryKey: queryKeys.searchAll(search),
    queryFn: () => api.searchRooms(search),
    enabled: enabled && search.length > 0,
    staleTime: 30_000,
  });
  const typed = query.trim();
  const term = foldText(typed);
  const items = loaded.filter((room) => foldText(room.title || room.name).includes(term)).map(roomTarget);
  // Chỉ gộp kết quả BE của đúng chữ đang gõ: trong lúc debounce `search` còn là từ khóa trước
  if (search && search === typed && found.data) {
    const seen = new Set(items.map((target) => target.key));
    const add = (target: ConversationTarget) => {
      if (!seen.has(target.key)) {
        seen.add(target.key);
        items.push(target);
      }
    };
    found.data.rooms.forEach((room) => add(roomTarget(room)));
    found.data.users.forEach((user) => {
      const direct = loaded.find((room) => room.peerUserId === user.id);
      add(direct ? roomTarget(direct) : { key: `user:${user.id}`, userId: user.id, name: user.name, avatarUrl: user.avatarUrl });
    });
  }
  return { items, searching: Boolean(typed) && (search !== typed || found.isLoading) };
}
