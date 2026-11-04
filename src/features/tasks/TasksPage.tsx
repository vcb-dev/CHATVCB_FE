import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, Spin, Typography } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type {
  ChatMessage,
  MyTasksQuery,
  PlannedTask,
  Room,
  Task,
  TaskPreset,
  TaskRoom,
} from '@/types';
import { AnchoredPopover } from './components/AnchoredPopover';
import { TaskCalendar } from './components/TaskCalendar';
import { TaskChip } from './components/TaskChip';
import { TaskLegend } from './components/TaskLegend';
import { TaskList } from './components/TaskList';
import { PlannedPeek, TaskPeek } from './components/TaskPeek';
import { TaskQuickCreate } from './components/TaskQuickCreate';
import { TasksSidebar } from './components/TasksSidebar';
import { TaskWeekView } from './components/TaskWeekView';
import { useTaskFilters, type TaskView } from './hooks/useTaskFilters';
import {
  addDays,
  addMonths,
  monthGrid,
  monthTitle,
  presetDue,
  rangeOf,
  weekDays,
  weekTitle,
  type CalendarItem,
} from './utils/calendar';

const EMPTY_TASKS: Task[] = [];
const EMPTY_ROOMS: TaskRoom[] = [];
const EMPTY_PLANNED: PlannedTask[] = [];

const VIEWS: { value: TaskView; label: string }[] = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'list', label: 'Danh sách' },
];

type Peek =
  | { kind: 'task'; task: Task; anchor: DOMRect }
  | { kind: 'planned'; planned: PlannedTask; anchor: DOMRect };

export function TasksPage(props: {
  userId: string;
  rooms: Room[];
  onOpenTask: (task: Task) => void;
  onAssign: (preset?: TaskPreset) => void;
  onAssigned: (created: ChatMessage) => void;
}) {
  const filters = useTaskFilters();
  const [anchor, setAnchor] = useState(() => new Date());
  const [peek, setPeek] = useState<Peek | null>(null);
  const [draft, setDraft] = useState<{ dueAt: string; anchor: DOMRect } | null>(null);
  const dismissing = useRef(false);
  const queryClient = useQueryClient();
  const { view, scope } = filters;
  const isCalendar = view !== 'list';
  const days = useMemo(() => weekDays(anchor), [anchor]);

  const mainQuery: MyTasksQuery = useMemo(() => {
    if (view === 'week') {
      return { scope, ...rangeOf(days) };
    }
    return view === 'month' ? { scope, ...rangeOf(monthGrid(anchor)) } : { scope };
  }, [view, scope, days, anchor]);
  const noDueQuery: MyTasksQuery = { scope, noDue: true };

  const main = useQuery({
    queryKey: queryKeys.myTasks(mainQuery),
    queryFn: () => api.myTasks(mainQuery),
    placeholderData: isCalendar ? keepPreviousData : undefined,
  });
  const noDue = useQuery({
    queryKey: queryKeys.myTasks(noDueQuery),
    queryFn: () => api.myTasks(noDueQuery),
    enabled: isCalendar,
  });
  const planned = useQuery({
    queryKey: queryKeys.plannedTasks(mainQuery),
    queryFn: () => api.plannedTasks(mainQuery),
    enabled: isCalendar,
    placeholderData: keepPreviousData,
  });
  const rooms = useQuery({
    queryKey: queryKeys.myTaskRooms,
    queryFn: () => api.myTaskRooms(),
  });

  // Danh sách có nhóm "Đã hủy" riêng nên không rối; công tắc chỉ áp dụng cho lịch
  const visible = (task: Task) =>
    !filters.hiddenRooms.includes(task.roomId) &&
    (!isCalendar || filters.showCancelled || task.status !== 'cancelled');
  const tasks = (main.data ?? EMPTY_TASKS).filter(visible);
  const noDueTasks = (noDue.data ?? EMPTY_TASKS).filter(visible);
  const calendarItems: CalendarItem[] = [
    ...tasks
      .filter((task) => task.dueAt)
      .map((task): CalendarItem => ({ kind: 'task', task })),
    ...(planned.data ?? EMPTY_PLANNED)
      .filter((item) => !filters.hiddenRooms.includes(item.roomId))
      .map((item): CalendarItem => ({ kind: 'planned', planned: item })),
  ];

  const closeOverlays = useCallback(() => {
    setPeek(null);
    setDraft(null);
  }, []);

  // Như Google: lần bấm ra ngoài chỉ đóng khung, không mở luôn tạo việc ở ô vừa bấm
  const dismissOverlays = () => {
    closeOverlays();
    dismissing.current = true;
    window.addEventListener(
      'click',
      () => {
        window.setTimeout(() => {
          dismissing.current = false;
        });
      },
      { capture: true, once: true },
    );
  };

  const openTask = (task: Task, anchor: DOMRect) => {
    setDraft(null);
    setPeek({ kind: 'task', task, anchor });
  };
  const openPlanned = (item: PlannedTask, anchor: DOMRect) => {
    setDraft(null);
    setPeek({ kind: 'planned', planned: item, anchor });
  };
  const openDraft = (dueAt: string, anchor: DOMRect) => {
    if (!dismissing.current) {
      setPeek(null);
      setDraft({ dueAt, anchor });
    }
  };

  const move = (step: number) => {
    setAnchor((current) =>
      view === 'week' ? addDays(current, step * 7) : addMonths(current, step),
    );
  };

  return (
    <div className="tasks-page">
      <TasksSidebar
        userId={props.userId}
        anchor={anchor}
        scope={scope}
        rooms={rooms.data ?? EMPTY_ROOMS}
        hiddenRooms={filters.hiddenRooms}
        showCancelled={filters.showCancelled}
        canToggleCancelled={isCalendar}
        onPickDay={(day) => {
          setAnchor(day);
          if (!isCalendar) {
            filters.setView('week');
          }
        }}
        onAdd={() => props.onAssign()}
        onScope={filters.setScope}
        onToggleRoom={filters.toggleRoom}
        onSetHiddenRooms={filters.setHiddenRooms}
        onShowCancelled={filters.setShowCancelled}
      />
      <div className="tasks-main" onScrollCapture={closeOverlays}>
        <div className="tasks-main-head">
          {isCalendar ? (
            <div className="tasks-cal-nav">
              <Button shape="round" className="tasks-cal-today" onClick={() => setAnchor(new Date())}>
                Hôm nay
              </Button>
              <Button
                type="text"
                shape="circle"
                aria-label="Trước"
                className="tasks-cal-prev"
                icon={<LeftOutlined />}
                onClick={() => move(-1)}
              />
              <Button
                type="text"
                shape="circle"
                aria-label="Sau"
                className="tasks-cal-next"
                icon={<RightOutlined />}
                onClick={() => move(1)}
              />
              <Typography.Title level={4} className="tasks-cal-title">
                {view === 'week' ? weekTitle(days) : monthTitle(anchor)}
              </Typography.Title>
            </div>
          ) : (
            <Typography.Title level={4} className="tasks-cal-title">
              Công việc
            </Typography.Title>
          )}
          <Select<TaskView>
            className="tasks-page-view"
            options={VIEWS}
            value={view}
            onChange={filters.setView}
          />
        </div>
        {main.error ? (
          <Typography.Text type="danger">
            {errorText(main.error, 'Không tải được công việc.')}
          </Typography.Text>
        ) : main.isLoading ? (
          <Spin size="small" />
        ) : isCalendar ? (
          <>
            <TaskLegend />
            {view === 'week' ? (
              <TaskWeekView
                days={days}
                items={calendarItems}
                draftDue={draft?.dueAt}
                onOpen={openTask}
                onOpenPlanned={openPlanned}
                onCreate={openDraft}
              />
            ) : (
              <TaskCalendar
                anchor={anchor}
                items={calendarItems}
                draftDue={draft?.dueAt}
                onOpen={openTask}
                onOpenPlanned={openPlanned}
                onCreate={(day, anchor) => openDraft(presetDue(day, new Date()), anchor)}
              />
            )}
            {noDueTasks.length > 0 ? (
              <section className="tasks-nodue">
                <h3>Chưa có hạn ({noDueTasks.length})</h3>
                <div className="tasks-nodue-list">
                  {noDueTasks.map((task) => (
                    <TaskChip key={task.id} task={task} onOpen={openTask} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <TaskList tasks={tasks} userId={props.userId} onOpenTask={props.onOpenTask} />
        )}
      </div>
      {peek ? (
        <AnchoredPopover
          key={peek.kind === 'task' ? peek.task.id : `${peek.planned.seriesId}:${peek.planned.dueAt}`}
          anchor={peek.anchor}
          onClose={closeOverlays}
          onClickOutside={dismissOverlays}
        >
          {peek.kind === 'task' ? (
            <TaskPeek
              task={peek.task}
              userId={props.userId}
              onClose={closeOverlays}
              onOpenInChat={(task) => {
                closeOverlays();
                props.onOpenTask(task);
              }}
            />
          ) : (
            <PlannedPeek
              planned={peek.planned}
              userId={props.userId}
              onClose={closeOverlays}
              onStopped={() => {
                void queryClient.invalidateQueries({ queryKey: queryKeys.taskLists });
              }}
            />
          )}
        </AnchoredPopover>
      ) : null}
      {draft ? (
        <AnchoredPopover
          key={draft.dueAt}
          anchor={draft.anchor}
          onClose={closeOverlays}
          onClickOutside={dismissOverlays}
        >
          <TaskQuickCreate
            dueAt={draft.dueAt}
            rooms={props.rooms}
            userId={props.userId}
            onClose={closeOverlays}
            onCreated={props.onAssigned}
            onMore={(preset) => {
              closeOverlays();
              props.onAssign(preset);
            }}
          />
        </AnchoredPopover>
      ) : null}
    </div>
  );
}
