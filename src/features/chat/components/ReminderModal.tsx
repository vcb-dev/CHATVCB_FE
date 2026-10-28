import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Reminder } from '@/types';
import { fromLocalInput, toLocalInput } from '../utils/datetime';

type ReminderModalProps = {
  open: boolean;
  roomId: string;
  reminder: Reminder | null;
  onClose: () => void;
};

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Không lặp' },
  { value: 'daily', label: 'Hằng ngày' },
  { value: 'weekly', label: 'Hằng tuần' },
];

export function ReminderModal({
  open,
  roomId,
  reminder,
  onClose,
}: ReminderModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (reminder) {
        setTitle(reminder.title);
        setRemindAt(toLocalInput(reminder.remindAt));
        setRepeat(reminder.repeat);
      } else {
        setTitle('');
        const defaultDate = new Date(Date.now() + 15 * 60_000);
        setRemindAt(toLocalInput(defaultDate.toISOString()));
        setRepeat('none');
      }
    }
  }, [open, reminder]);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      message.error('Tiêu đề không được trống.');
      return;
    }
    if (!remindAt) {
      message.error('Vui lòng chọn thời gian nhắc.');
      return;
    }

    try {
      setLoading(true);
      const isoTime = fromLocalInput(remindAt);
      if (new Date(isoTime) <= new Date()) {
        message.error('Thời gian nhắc phải sau thời điểm hiện tại.');
        return;
      }

      if (reminder) {
        await api.updateReminder(roomId, reminder.id, {
          title: t,
          remindAt: isoTime,
          repeat,
        });
        message.success('Đã cập nhật nhắc hẹn');
      } else {
        await api.createReminder(roomId, {
          title: t,
          remindAt: isoTime,
          repeat,
        });
        message.success('Đã tạo nhắc hẹn');
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.reminders(roomId),
      });
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const minTime = toLocalInput(new Date().toISOString());

  return (
    <Modal
      open={open}
      title={reminder ? 'Sửa nhắc hẹn' : 'Tạo nhắc hẹn'}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!title.trim() || !remindAt}
          onClick={handleSubmit}
        >
          {reminder ? 'Lưu' : 'Tạo nhắc hẹn'}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form layout="vertical" className="mt-3">
        <Form.Item label="Nội dung nhắc hẹn" required>
          <Input
            placeholder="Nhập nội dung nhắc hẹn..."
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="Thời gian" required>
          <Input
            type="datetime-local"
            min={minTime}
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="Lặp lại">
          <Select
            value={repeat}
            onChange={(v) => setRepeat(v)}
            options={REPEAT_OPTIONS}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
