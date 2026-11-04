import { message as antMessage } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { errorText } from '@/lib/errors';
import type { Room, Task } from '@/types';
import type { Workspace } from './useWorkspace';

export function useOpenTask({
  roomId,
  workspace,
  messagesLoaded,
  setWorkspace,
  findRoom,
  openRoom,
  jumpToMessage,
}: {
  roomId: string;
  workspace: Workspace;
  messagesLoaded: boolean;
  setWorkspace: (workspace: Workspace) => void;
  findRoom: (id: string) => Promise<Room>;
  openRoom: (room: Room) => Promise<void>;
  jumpToMessage: (id: string, createdAt?: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<Task | null>(null);
  const jumpRef = useRef(jumpToMessage);
  jumpRef.current = jumpToMessage;
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const requestRef = useRef(0);

  // Chờ khung chat vẽ xong tin của đúng phòng rồi mới nhảy; lúc còn ở màn Công việc thì DOM chưa có tin
  useEffect(() => {
    if (!pending) {
      return;
    }
    // Người dùng đã đi nơi khác trước khi tin tải xong: bỏ hẳn, đừng nhảy khi họ quay lại sau này
    if (workspace !== 'messenger' || roomId !== pending.roomId) {
      setPending(null);
      return;
    }
    if (!messagesLoaded) {
      return;
    }
    setPending(null);
    const { messageId, createdAt } = pending;
    if (messageId) {
      requestAnimationFrame(() => {
        void jumpRef.current(messageId, createdAt);
      });
    }
  }, [pending, workspace, roomId, messagesLoaded]);

  return async function openTask(task: Task) {
    requestRef.current += 1;
    const request = requestRef.current;
    // Lần bấm sau hoặc việc rời màn Công việc thắng lần bấm đang chờ mạng
    const superseded = () => request !== requestRef.current || workspaceRef.current !== 'tasks';
    try {
      const target = await findRoom(task.roomId);
      if (superseded()) {
        return;
      }
      await openRoom(target);
      if (superseded()) {
        return;
      }
      setWorkspace('messenger');
      setPending(task);
    } catch (err) {
      if (!superseded()) {
        antMessage.error(errorText(err, 'Không mở được cuộc trò chuyện.'));
      }
    }
  };
}
