import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { FormField } from '@/components/FormField';
import type { Reminder } from '@/types';
import { fromLocalInput, toLocalInput } from '../utils/datetime';

type Props = {
  open: boolean;
  roomId: string;
  reminder: Reminder | null;
  onClose: () => void;
};

type ReminderFormValues = {
  title: string;
  remindAt: string;
  repeat: 'none' | 'daily' | 'weekly';
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
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit: submitForm,
    reset,
    formState: { isValid },
  } = useForm<ReminderFormValues>({
    mode: 'onChange',
    defaultValues: { title: '', remindAt: '', repeat: 'none' },
  });

  useEffect(() => {
    if (open) {
      if (reminder) {
        reset({
          title: reminder.title,
          remindAt: toLocalInput(reminder.remindAt),
          repeat: reminder.repeat,
        });
      } else {
        const defaultDate = new Date(Date.now() + 15 * 60_000);
        reset({ title: '', remindAt: toLocalInput(defaultDate.toISOString()), repeat: 'none' });
      }
    }
  }, [open, reminder, reset]);

  // Tiêu đề trống / chưa chọn giờ: nút Lưu đã khoá (luật của form), không tới được đây
  const handleSubmit = async ({ title, remindAt, repeat }: ReminderFormValues) => {
    const t = title.trim();
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
          disabled={!isValid}
          onClick={() => void submitForm(handleSubmit)()}
        >
          {reminder ? 'Lưu' : 'Tạo nhắc hẹn'}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form layout="vertical" className="mt-3">
        <FormField
          control={control}
          name="title"
          label="Nội dung nhắc hẹn"
          rules={{ required: true, validate: (value) => Boolean(value.trim()) }}
        >
          <Input placeholder="Nhập nội dung nhắc hẹn..." maxLength={200} />
        </FormField>

        <FormField control={control} name="remindAt" label="Thời gian" rules={{ required: true }}>
          <Input type="datetime-local" min={minTime} />
        </FormField>

        <FormField control={control} name="repeat" label="Lặp lại">
          <Select options={REPEAT_OPTIONS} />
        </FormField>
      </Form>
    </Modal>
  );
}
