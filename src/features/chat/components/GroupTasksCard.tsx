import { CheckSquareOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { canAssignTask, formatDue, isOverdue } from '@/lib/tasks';
import type { Room, Task } from '@/types';
import { GroupBoardCard } from './GroupBoardCard';

type Props = {
  room: Room;
  onCreate: () => void;
  onOpen: (task: Task) => void;
};

export function GroupTasksCard({ room, onCreate, onOpen }: Props) {
  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.roomTasks(room.id),
    queryFn: () => api.roomTasks(room.id),
    // Rời phòng là hết nhận message.updated của phòng đó, nên mỗi lần quay lại phải tải lại
    staleTime: 0,
  });

  return (
    <GroupBoardCard
      icon={<CheckSquareOutlined />}
      title="Công việc"
      countLabel={`${tasks.length} việc đang mở`}
      emptyText="Chưa có việc nào đang mở"
      hasItems={tasks.length > 0}
      onCreate={canAssignTask(room) ? onCreate : undefined}
    >
      {tasks.map((task) => (
        <div key={task.id} className="board-row task-board-row" onClick={() => onOpen(task)}>
          <div className="board-row-main">
            <div className="board-row-title">{task.title}</div>
            <small>
              {task.assignee.name}
              {task.dueAt ? ` · ${formatDue(task.dueAt)}` : ''}
              {isOverdue(task) ? <span className="task-overdue">Quá hạn</span> : null}
            </small>
          </div>
        </div>
      ))}
    </GroupBoardCard>
  );
}
