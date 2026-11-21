import { useQueryClient } from '@tanstack/react-query';
import { Modal, message as antMessage } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { DirectoryUser, Room } from '@/types';

/** Chặn / bỏ chặn một người và cập nhật các DM với người đó ngay trên danh sách phòng. */
export function useBlockUser({ setRooms }: { setRooms: Dispatch<SetStateAction<Room[]>> }) {
  const queryClient = useQueryClient();

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
    queryClient.setQueryData<DirectoryUser>(queryKeys.user(userId), (current) =>
      current ? { ...current, blockedByMe: blocked } : current,
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.blockedUsers });
    antMessage.success(blocked ? 'Đã chặn người này.' : 'Đã bỏ chặn.');
    return true;
  }

  /** Chặn thì hỏi lại trước (bỏ chặn làm luôn); trả `true` khi đã đổi xong. */
  function askBlock(userId: string, name: string, blocked: boolean): Promise<boolean> {
    if (!blocked) {
      return setBlocked(userId, false);
    }
    return new Promise((resolve) => {
      Modal.confirm({
        title: `Chặn ${name}?`,
        content:
          'Hai bạn sẽ không nhắn tin riêng hay gọi cho nhau được. Trong nhóm chung vẫn nhắn bình thường.',
        okText: 'Chặn',
        cancelText: 'Hủy',
        okButtonProps: { danger: true },
        onOk: async () => resolve(await setBlocked(userId, true)),
        onCancel: () => resolve(false),
      });
    });
  }

  return { setBlocked, askBlock };
}
