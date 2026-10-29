import { message as antMessage } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '@/api/client';
import type { Room } from '@/types';

/** Chặn / bỏ chặn một người và cập nhật các DM với người đó ngay trên danh sách phòng. */
export function useBlockUser({ setRooms }: { setRooms: Dispatch<SetStateAction<Room[]>> }) {
  async function setBlocked(userId: string, blocked: boolean): Promise<boolean> {
    try {
      if (blocked) {
        await api.blockUser(userId);
      } else {
        await api.unblockUser(userId);
      }
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không thực hiện được.');
      return false;
    }
    setRooms((current) =>
      current.map((room) => (room.peerUserId === userId ? { ...room, blockedByMe: blocked } : room)),
    );
    antMessage.success(blocked ? 'Đã chặn người này.' : 'Đã bỏ chặn.');
    return true;
  }

  return { setBlocked };
}
