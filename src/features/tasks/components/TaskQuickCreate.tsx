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
import { formatDue } from '@/lib/tasks';
import type { AssignKind, ChatMessage, Room, RoomMember, TaskPreset } from '@/types';

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
  const [loading, setLoading] = useState(false);
  const target = useAssignTarget({
    rooms: props.rooms,
    currentUserId: props.userId,
    members: NO_MEMBERS,
    isDirect: false,
  });
  const ready = Boolean(title.trim() && target.ready);

  const submit = async () => {
    if (!ready || loading) {
      return;
    }
    if (new Date(props.dueAt) <= new Date()) {
      message.error('Hạn phải sau thời điểm hiện tại.');
      return;
    }
    setLoading(true);
    try {
      const roomId = await target.resolveRoomId();
      const created = await api.createTask(roomId as string, {
        title: title.trim(),
        assigneeId: target.assigneeId as string,
        dueAt: fromLocalInput(props.dueAt),
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
      <Input
        autoFocus
        className="task-quick-title"
        placeholder="Cần làm gì?"
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onPressEnter={() => void submit()}
      />
      <span className="task-quick-due">Hạn: {formatDue(fromLocalInput(props.dueAt))}</span>
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
      <div className="task-quick-actions">
        <Button
          type="text"
          size="small"
          onClick={() =>
            props.onMore({
              dueAt: props.dueAt,
              title,
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
