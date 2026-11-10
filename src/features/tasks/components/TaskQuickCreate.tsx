import { ClockCircleOutlined, FileTextOutlined, SyncOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Segmented, Select, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import {
  ASSIGN_KINDS,
  SELF_ASSIGN_NOTE,
  useAssignTarget,
} from '@/features/chat/hooks/useAssignTarget';
import { fromLocalInput } from '@/features/chat/utils/datetime';
import { errorText } from '@/lib/errors';
import { TASK_REPEAT_OPTIONS } from '@/lib/tasks';
import type { AssignKind, ChatMessage, Room, RoomMember, TaskFrequency, TaskPreset } from '@/types';

const NO_MEMBERS: RoomMember[] = [];

export function TaskQuickCreate(props: {
  dueAt: string;
  rooms: Room[];
  userId: string;
  onClose: () => void;
  onMore: (preset: TaskPreset) => void;
  onCreated: (created: ChatMessage) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState(props.dueAt);
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState<TaskFrequency | 'none'>('none');
  const [loading, setLoading] = useState(false);
  const target = useAssignTarget({
    rooms: props.rooms,
    currentUserId: props.userId,
    members: NO_MEMBERS,
    isDirect: false,
  });
  // Việc lặp lại tính kỳ sau từ hạn nên bắt buộc có hạn, giống hộp thoại đầy đủ
  const ready = Boolean(title.trim() && target.ready && (dueAt || repeat === 'none'));

  const submit = async () => {
    if (!ready || loading) {
      return;
    }
    if (dueAt && new Date(dueAt) <= new Date()) {
      message.error('Hạn phải sau thời điểm hiện tại.');
      return;
    }
    setLoading(true);
    try {
      const roomId = await target.resolveRoomId();
      const created = await api.createTask(roomId as string, {
        title: title.trim(),
        assigneeId: target.assigneeId as string,
        notes: notes.trim() || undefined,
        dueAt: dueAt ? fromLocalInput(dueAt) : undefined,
        repeat: repeat === 'none' ? undefined : { frequency: repeat },
      });
      props.onCreated(created);
      message.success('Đã giao việc.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      props.onClose();
    } catch (err) {
      message.error(errorText(err, 'Không giao được việc.'));
      setLoading(false);
    }
  };

  return (
    <div className="task-quick">
      <div className="task-quick-head">Giao việc mới</div>
      <Input
        autoFocus
        className="task-quick-title"
        placeholder="Cần làm gì?"
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onPressEnter={() => void submit()}
      />
      <div className="task-quick-row">
        <ClockCircleOutlined />
        <Input
          size="small"
          type="datetime-local"
          className="task-quick-due"
          aria-label="Hạn"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </div>
      <div className="task-quick-row">
        <SyncOutlined />
        <Select
          size="small"
          className="task-quick-repeat"
          aria-label="Lặp lại"
          value={repeat}
          onChange={setRepeat}
          options={TASK_REPEAT_OPTIONS}
        />
      </div>
      <Segmented<AssignKind>
        block
        size="small"
        options={ASSIGN_KINDS}
        value={target.kind}
        onChange={target.changeKind}
      />
      {target.pickingPerson ? (
        <>
          <Select
            className="task-quick-person"
            placeholder="Chọn người nhận"
            showSearch={{ optionFilterProp: 'label' }}
            value={target.assigneeId}
            onChange={target.setAssigneeId}
            options={target.personOptions}
            notFoundContent="Không tìm thấy người này"
          />
          {target.pickingSelf ? (
            <span className="task-quick-self">{SELF_ASSIGN_NOTE}</span>
          ) : null}
        </>
      ) : (
        <>
          <Select
            className="task-quick-room"
            placeholder="Chọn nhóm"
            showSearch={{ optionFilterProp: 'label', onSearch: target.setRoomSearch }}
            value={target.roomId}
            onChange={target.pickRoom}
            options={target.roomOptions}
            notFoundContent="Không có nhóm bạn được giao việc"
          />
          <Select
            className="task-quick-assignee"
            placeholder={target.roomId ? 'Chọn người nhận' : 'Chọn nhóm trước'}
            disabled={!target.roomId}
            showSearch={{ optionFilterProp: 'label' }}
            value={target.assigneeId}
            onChange={target.setAssigneeId}
            options={target.memberOptions}
          />
        </>
      )}
      <div className="task-quick-row top">
        <FileTextOutlined />
        <Input.TextArea
          className="task-quick-notes"
          placeholder="Ghi chú (không bắt buộc)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          maxLength={2000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <div className="task-quick-actions">
        <Button
          type="text"
          size="small"
          onClick={() =>
            props.onMore({
              dueAt,
              title,
              notes,
              repeat: repeat === 'none' ? undefined : repeat,
              kind: target.kind,
              roomId: target.roomId,
              roomLabel: target.roomOptions.find((option) => option.value === target.roomId)?.label,
              assigneeId: target.assigneeId,
            })
          }
        >
          Thêm tùy chọn
        </Button>
        <Button
          type="primary"
          size="small"
          className="task-quick-submit"
          disabled={!ready}
          loading={loading}
          onClick={() => void submit()}
        >
          Giao việc
        </Button>
      </div>
    </div>
  );
}
