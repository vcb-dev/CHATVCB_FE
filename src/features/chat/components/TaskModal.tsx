import { Button, Form, Input, Modal, Segmented, Select, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { FormField } from '@/components/FormField';
import { errorText } from '@/lib/errors';
import { TASK_REPEAT_OPTIONS } from '@/lib/tasks';
import type {
  AssignKind,
  ChatMessage,
  MessageTask,
  Room,
  RoomMember,
  TaskFrequency,
  TaskPreset,
} from '@/types';
import { ASSIGN_KINDS, SELF_ASSIGN_NOTE, useAssignTarget } from '../hooks/useAssignTarget';
import { fromLocalInput, toLocalInput } from '../utils/datetime';

type Props = {
  open: boolean;
  roomId: string;
  members: RoomMember[];
  currentUserId: string;
  isDirect: boolean;
  task: MessageTask | null;
  onClose: () => void;
  onCreated?: (created: ChatMessage) => void;
  /** Có thì người dùng tự chọn nhóm (giao từ màn Công việc) thay vì dùng roomId. */
  rooms?: Room[];
  preset?: TaskPreset;
};

type TaskFormValues = {
  title: string;
  dueAt: string;
  notes: string;
  repeat: TaskFrequency | 'none';
  endsAt: string;
};

function initialDue(task: MessageTask | null) {
  return task?.dueAt ? toLocalInput(task.dueAt) : '';
}

export function TaskModal({
  open,
  roomId,
  members,
  currentUserId,
  isDirect,
  task,
  onClose,
  onCreated,
  rooms,
  preset,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  // Gõ phím chỉ vẽ lại ô đang gõ; modal chỉ vẽ lại khi form đổi giữa hợp lệ / chưa hợp lệ (nút Giao việc)
  const {
    control,
    handleSubmit: submitForm,
    reset,
    formState: { isValid },
  } = useForm<TaskFormValues>({
    mode: 'onChange',
    defaultValues: { title: '', dueAt: '', notes: '', repeat: 'none', endsAt: '' },
  });
  const repeat = useWatch({ control, name: 'repeat' });
  const target = useAssignTarget({ rooms, currentUserId, members, isDirect });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({
      title: task?.title ?? preset?.title ?? '',
      dueAt: task ? initialDue(task) : (preset?.dueAt ?? ''),
      notes: task?.notes ?? preset?.notes ?? '',
      repeat: task ? 'none' : (preset?.repeat ?? 'none'),
      endsAt: '',
    });
    target.reset(preset);
    // Theo id: thả cảm xúc hay ghim tin đều thay đối tượng task, không được xóa nội dung đang sửa
  }, [open, task?.id, preset]);

  const picking = Boolean(rooms);
  const chosenAssignee = target.assigneeId;

  const handleEdit = async (editing: MessageTask, { title, notes, dueAt }: TaskFormValues) => {
    const dueChanged = dueAt !== initialDue(editing);
    const patch: { title?: string; notes?: string; dueAt?: string | null } = {};
    if (title.trim() !== editing.title) {
      patch.title = title.trim();
    }
    if (notes.trim() !== editing.notes) {
      patch.notes = notes.trim();
    }
    if (dueChanged) {
      patch.dueAt = dueAt ? fromLocalInput(dueAt) : null;
    }
    if (Object.keys(patch).length > 0) {
      await api.updateTask(editing.id, patch);
      message.success('Đã cập nhật việc.');
    }
  };

  const handleCreate = async ({ title, notes, dueAt, repeat, endsAt }: TaskFormValues) => {
    const targetRoomId = picking ? await target.resolveRoomId() : roomId;
    const created = await api.createTask(targetRoomId as string, {
      title: title.trim(),
      assigneeId: chosenAssignee as string,
      notes: notes.trim() || undefined,
      dueAt: dueAt ? fromLocalInput(dueAt) : undefined,
      repeat:
        repeat === 'none' ? undefined : { frequency: repeat, endsAt: endsAt || undefined },
    });
    onCreated?.(created);
    message.success('Đã giao việc.');
  };

  const handleSubmit = async (values: TaskFormValues) => {
    const dueChanged = values.dueAt !== initialDue(task);
    if (dueChanged && values.dueAt && new Date(values.dueAt) <= new Date()) {
      message.error('Hạn phải sau thời điểm hiện tại.');
      return;
    }
    setLoading(true);
    try {
      await (task ? handleEdit(task, values) : handleCreate(values));
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      onClose();
    } catch (err) {
      message.error(errorText(err, task ? 'Không cập nhật được việc.' : 'Không giao được việc.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      className="task-modal"
      title={task ? 'Sửa việc' : 'Giao việc'}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!isValid || (!task && !target.ready)}
          onClick={() => void submitForm(handleSubmit)()}
        >
          {task ? 'Lưu' : 'Giao việc'}
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form layout="vertical">
        {picking ? (
          <Form.Item label="Giao cho">
            <Segmented<AssignKind>
              block
              options={ASSIGN_KINDS}
              value={target.kind}
              onChange={target.changeKind}
            />
          </Form.Item>
        ) : null}
        {target.pickingPerson ? (
          <Form.Item
            label="Người nhận"
            required
            extra={
              target.pickingSelf ? <span className="task-modal-self">{SELF_ASSIGN_NOTE}</span> : undefined
            }
          >
            <Select
              className="task-modal-person"
              placeholder="Chọn người nhận"
              showSearch={{ optionFilterProp: 'label' }}
              value={chosenAssignee}
              onChange={target.setAssigneeId}
              options={target.personOptions}
              notFoundContent="Không tìm thấy người này"
            />
          </Form.Item>
        ) : picking ? (
          <Form.Item label="Nhóm" required>
            <Select
              className="task-modal-room"
              placeholder="Chọn nhóm"
              showSearch={{ optionFilterProp: 'label', onSearch: target.setRoomSearch }}
              value={target.roomId}
              onChange={target.pickRoom}
              options={target.roomOptions}
              notFoundContent="Không có nhóm bạn được giao việc"
            />
          </Form.Item>
        ) : null}
        <FormField
          control={control}
          name="title"
          label="Tiêu đề"
          rules={{ required: true, validate: (value) => Boolean(value.trim()) }}
        >
          <Input placeholder="Cần làm gì?" maxLength={200} />
        </FormField>
        {target.pickingPerson ? null : (
          <Form.Item label="Người nhận" required={!task}>
            {task ? (
              <Input value={task.assigneeName} disabled />
            ) : (
              <Select
                className="task-modal-assignee"
                placeholder={picking && !target.roomId ? 'Chọn nhóm trước' : 'Chọn người nhận'}
                disabled={picking && !target.roomId}
                showSearch={{ optionFilterProp: 'label' }}
                value={chosenAssignee}
                onChange={target.setAssigneeId}
                options={target.memberOptions}
              />
            )}
          </Form.Item>
        )}
        <FormField
          control={control}
          name="dueAt"
          label="Hạn"
          // Việc lặp lại cần có hạn (tính từ hạn đầu tiên)
          rules={{ validate: (value, all) => Boolean(task) || all.repeat === 'none' || Boolean(value) }}
        >
          <Input type="datetime-local" />
        </FormField>
        {task ? null : (
          <FormField control={control} name="repeat" label="Lặp lại">
            <Select className="task-modal-repeat" options={TASK_REPEAT_OPTIONS} />
          </FormField>
        )}
        {!task && repeat !== 'none' ? (
          <FormField control={control} name="endsAt" label="Kết thúc (không bắt buộc)">
            <Input type="date" className="task-modal-ends" />
          </FormField>
        ) : null}
        <FormField control={control} name="notes" label="Ghi chú">
          <Input.TextArea rows={3} maxLength={2000} />
        </FormField>
      </Form>
    </Modal>
  );
}
