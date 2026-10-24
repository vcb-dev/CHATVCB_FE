import { FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Room, RoomNote } from '@/types';
import { formatShort } from '../utils/datetime';
import { GroupBoardCard } from './GroupBoardCard';

type GroupNotesCardProps = {
  room: Room;
  onOpen: (note: RoomNote) => void;
  onCreate: () => void;
};

export function GroupNotesCard({ room, onOpen, onCreate }: GroupNotesCardProps) {
  const { data: notes = [] } = useQuery({
    queryKey: queryKeys.notes(room.id),
    queryFn: () => api.notes(room.id),
    enabled: Boolean(room.id),
  });

  return (
    <GroupBoardCard
      icon={<FileTextOutlined />}
      title="Ghi chú"
      countLabel={`${notes.length} ghi chú`}
      emptyText="Chưa có ghi chú nào"
      hasItems={notes.length > 0}
      onCreate={onCreate}
    >
      {notes.map((n) => (
        <div key={n.id} className="board-row cursor-pointer" onClick={() => onOpen(n)}>
          <div className="board-row-main">
            <div className="board-row-title">{n.title}</div>
            <small>
              {n.updatedByName
                ? `Sửa bởi ${n.updatedByName} • ${formatShort(n.updatedAt)}`
                : `${n.creatorName} • ${formatShort(n.createdAt)}`}
            </small>
          </div>
        </div>
      ))}
    </GroupBoardCard>
  );
}
