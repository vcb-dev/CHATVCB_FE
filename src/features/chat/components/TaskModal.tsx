import { Button, Form, Input, Modal, Segmented, Select, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
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

const REPEAT_OPTIONS: { value: TaskFrequency | 'none'; label: string }[] = [
  { value: 'none', label: 'Không lặp' },
  { value: 'weekly', label: 'Hằng tuần' },
  { value: 'monthly', label: 'Hằng tháng' },
];

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
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [repeat, setRepeat] = useState<TaskFrequency | 'none'>('none');
  const [endsAt, setEndsAt] = useState('');
  const target = useAssignTarget({ rooms, currentUserId, members, isDirect });

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(task?.title ?? preset?.title ?? '');
    setDueAt(task ? initialDue(task) : (preset?.dueAt ?? ''));
    setNotes(task?.notes ?? '');
    target.reset(preset);
    setRepeat('none');
    setEndsAt('');
    // Theo id: thả cảm xúc hay ghim tin đều thay đối tượng task, không được xóa nội dung đang sửa
  }, [open, task?.id, preset]);

  const picking = Boolean(rooms);
  const chosenAssignee = target.assigneeId;
  const dueChanged = dueAt !== initialDue(task);

  const handleEdit = async (editing: MessageTask) => {
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

  const handleCreate = async () => {
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

  const handleSubmit = async () => {
    if (dueChanged && dueAt && new Date(dueAt) <= new Date()) {
      message.error('Hạn phải sau thời điểm hiện tại.');
      return;
    }
    setLoading(true);
    try {
      await (task ? handleEdit(task) : handleCreate());
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
          disabled={
            !title.trim() ||
            (!task && (!target.ready || (repeat !== 'none' && !dueAt)))
          }
          onClick={() => void handleSubmit()}
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
        <Form.Item label="Tiêu đề" required>
          <Input
            placeholder="Cần làm gì?"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Item>
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
        <Form.Item label="Hạn">
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Form.Item>
        {task ? null : (
          <Form.Item label="Lặp lại">
            <Select
              className="task-modal-repeat"
              value={repeat}
              onChange={setRepeat}
              options={REPEAT_OPTIONS}
            />
          </Form.Item>
        )}
        {!task && repeat !== 'none' ? (
          <Form.Item label="Kết thúc (không bắt buộc)">
            <Input
              type="date"
              className="task-modal-ends"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </Form.Item>
        ) : null}
        <Form.Item label="Ghi chú">
          <Input.TextArea
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
