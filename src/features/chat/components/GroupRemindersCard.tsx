import { useState } from 'react';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button, Modal, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Reminder, Room } from '@/types';
import { canEditItem } from '../utils/rooms';
import { formatShort } from '../utils/datetime';

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
  const [open, setOpen] = useState(false);
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
    <div className="group-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
        }}
      >
        <button
          type="button"
          className="group-row"
          style={{ padding: 0, flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setOpen(!open)}
        >
          <span className="group-ico">
            <ClockCircleOutlined />
          </span>
          <span className="group-row-text">
            <strong>Nhắc hẹn</strong>
            <small>{reminders.length} nhắc hẹn</small>
          </span>
          <RightOutlined className={open ? 'chev open' : 'chev'} />
        </button>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          style={{ marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(null);
          }}
        >
          Tạo
        </Button>
      </div>

      {open ? (
        reminders.length ? (
          <div className="group-board-list" style={{ borderTop: '1px solid #f0f0f0' }}>
            {reminders.map((r) => {
              const editable = canEditItem(room, r.creatorId, currentUserId);
              return (
                <div key={r.id} className="board-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.title}
                    </div>
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
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
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
          </div>
        ) : (
          <div
            style={{
              padding: '8px 12px',
              fontSize: 13,
              color: '#888',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            Chưa có nhắc hẹn nào
          </div>
        )
      ) : null}
    </div>
  );
}
