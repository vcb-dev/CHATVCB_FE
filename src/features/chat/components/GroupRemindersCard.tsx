import { ClockCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Modal, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Reminder, Room } from '@/types';
import { canEditItem } from '../utils/rooms';
import { formatShort } from '../utils/datetime';
import { GroupBoardCard } from './GroupBoardCard';

type GroupRemindersCardProps = {
  room: Room;
  currentUserId: string;
  onEdit: (reminder: Reminder | null) => void;
};

export function GroupRemindersCard({
  room,
  currentUserId,
  onEdit,
}: GroupRemindersCardProps) {
  const queryClient = useQueryClient();

  const { data: reminders = [] } = useQuery({
    queryKey: queryKeys.reminders(room.id),
    queryFn: () => api.reminders(room.id),
    enabled: Boolean(room.id),
  });

  const handleDelete = (reminderId: string) => {
    Modal.confirm({
      title: 'Xóa nhắc hẹn?',
      content: 'Bạn có chắc chắn muốn xóa nhắc hẹn này không?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.deleteReminder(room.id, reminderId);
          message.success('Đã xóa nhắc hẹn');
          await queryClient.invalidateQueries({
            queryKey: queryKeys.reminders(room.id),
          });
        } catch (err: any) {
          message.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        }
      },
    });
  };

  return (
    <GroupBoardCard
      icon={<ClockCircleOutlined />}
      title="Nhắc hẹn"
      countLabel={`${reminders.length} nhắc hẹn`}
      emptyText="Chưa có nhắc hẹn nào"
      hasItems={reminders.length > 0}
      onCreate={() => onEdit(null)}
    >
      {reminders.map((r) => {
        const editable = canEditItem(room, r.creatorId, currentUserId);
        return (
          <div key={r.id} className="board-row">
            <div className="board-row-main">
              <div className="board-row-title">{r.title}</div>
              <small>
                {formatShort(r.remindAt)}
                {r.repeat !== 'none' && (
                  <span className="board-repeat">
                    {r.repeat === 'daily' ? 'Hằng ngày' : 'Hằng tuần'}
                  </span>
                )}
              </small>
            </div>
            {editable && (
              <div className="board-row-actions">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(r)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(r.id)}
                />
              </div>
            )}
          </div>
        );
      })}
    </GroupBoardCard>
  );
}
