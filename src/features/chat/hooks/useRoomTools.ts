import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message as antMessage } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Reminder, Room, RoomNote, ToolKind } from '@/types';
import type { Workspace } from './useWorkspace';

export function useRoomTools({
  roomId,
  setWorkspace,
  openRoom,
}: {
  roomId: string;
  setWorkspace: (workspace: Workspace) => void;
  openRoom: (room: Room) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [toolModal, setToolModal] = useState<ToolKind | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [openNote, setOpenNote] = useState<RoomNote | null>(null);

  const openNoteById = async (noteId: string) => {
    try {
      const list = await queryClient.fetchQuery({
        queryKey: queryKeys.notes(roomId),
        queryFn: () => api.notes(roomId),
      });
      const found = list.find((n) => n.id === noteId);
      if (found) {
        setOpenNote(found);
      } else {
        void antMessage.info('Ghi chú đã bị xóa.');
      }
    } catch {
      void antMessage.info('Ghi chú đã bị xóa.');
    }
  };

  const openCloud = async () => {
    try {
      const cloud = await api.cloudRoom();
      await openRoom(cloud);
      setWorkspace('messenger');
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không mở được Cloud của tôi.');
    }
  };

  return {
    toolModal,
    setToolModal,
    editingReminder,
    setEditingReminder,
    openNote,
    setOpenNote,
    openNoteById,
    openCloud,
  };
}
