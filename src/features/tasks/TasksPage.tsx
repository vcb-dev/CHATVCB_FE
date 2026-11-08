import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Spin, Typography } from 'antd';
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
import { TaskContextMenu } from './components/TaskContextMenu';
import { TaskLegend } from './components/TaskLegend';
import { TaskList } from './components/TaskList';
import { PlannedPeek, TaskPeek } from './components/TaskPeek';
import { TaskQuickCreate } from './components/TaskQuickCreate';
import { TasksToolbar } from './components/TasksToolbar';
import { TaskWeekView } from './components/TaskWeekView';
import { useTaskFilters } from './hooks/useTaskFilters';
import {
  addDays,
  addMonths,
  hourLabel,
  hourRange,
  itemDue,
  monthGrid,
  monthTitle,
  presetDue,
  rangeOf,
  rangeTitle,
  weekDays,
  type CalendarItem,
  type ItemMenuHandler,
} from './utils/calendar';
import {
  CALENDAR_STATUSES,
  countByStatus,
  itemStatus,
  taskStatus,
  type CalendarStatus,
} from './utils/status';

const EMPTY_TASKS: Task[] = [];
const EMPTY_ROOMS: TaskRoom[] = [];
const EMPTY_PLANNED: PlannedTask[] = [];
const LIST_STATUSES = CALENDAR_STATUSES.filter((status) => status !== 'planned');

type Peek =
  | { kind: 'task'; task: Task; anchor: DOMRect; editDue?: boolean }
  | { kind: 'planned'; planned: PlannedTask; anchor: DOMRect };

type Menu = { item: CalendarItem; x: number; y: number; anchor: DOMRect };

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
  const [menu, setMenu] = useState<Menu | null>(null);
  const dismissing = useRef(false);
  const queryClient = useQueryClient();
  const { view, scope, hiddenStatuses } = filters;
  const isCalendar = view !== 'list';
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const grid = useMemo(() => monthGrid(anchor), [anchor]);

  const mainQuery: MyTasksQuery = useMemo(() => {
    if (view === 'week') {
      return { scope, ...rangeOf(days) };
    }
    return view === 'month' ? { scope, ...rangeOf(grid) } : { scope };
  }, [view, scope, days, grid]);
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

  const roomList = rooms.data ?? EMPTY_ROOMS;
  // Nhóm đã chọn nay không còn việc nào thì bỏ qua, kẻo lịch trống mà không rõ vì sao
  const roomIds = filters.roomIds.filter((id) => roomList.some((room) => room.roomId === id));
  const inRooms = (roomId: string) => roomIds.length === 0 || roomIds.includes(roomId);
  const shown = (status: CalendarStatus) => !hiddenStatuses.includes(status);

  const allTasks = main.data ?? EMPTY_TASKS;
  const noDueAll = noDue.data ?? EMPTY_TASKS;
  const rangeTasks = allTasks.filter((task) => inRooms(task.roomId) && (!isCalendar || task.dueAt));
  const rangeItems: CalendarItem[] = [
    ...rangeTasks.map((task): CalendarItem => ({ kind: 'task', task })),
    ...(isCalendar ? (planned.data ?? EMPTY_PLANNED) : EMPTY_PLANNED)
      .filter((item) => inRooms(item.roomId))
      .map((item): CalendarItem => ({ kind: 'planned', planned: item })),
  ];
  // Lịch tháng lấy dư mấy ngày đầu/cuối để lấp lưới; con số chỉ tính ngày trong tháng
  const counted =
    view === 'month'
      ? rangeItems.filter((item) => new Date(itemDue(item)).getMonth() === anchor.getMonth())
      : rangeItems;
  const counts = countByStatus(counted.map(itemStatus));
  const visibleCount = counted.filter((item) => shown(itemStatus(item))).length;
  const calendarItems = rangeItems.filter((item) => shown(itemStatus(item)));
  const listTasks = rangeTasks.filter((task) => shown(taskStatus(task)));
  const noDueTasks = noDueAll.filter((task) => inRooms(task.roomId) && shown(taskStatus(task)));
  const range = hourRange(calendarItems);

  // Khung đang mở giữ bản việc lúc bấm; lấy bản mới nhất để sửa xong thấy ngay
  const peekTask =
    peek?.kind === 'task'
      ? (allTasks.find((task) => task.id === peek.task.id) ??
        noDueAll.find((task) => task.id === peek.task.id) ??
        peek.task)
      : null;

  const closeOverlays = useCallback(() => {
    setPeek(null);
    setDraft(null);
    setMenu(null);
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);

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

  const openTask = (task: Task, rect: DOMRect) => {
    setDraft(null);
    setMenu(null);
    setPeek({ kind: 'task', task, anchor: rect });
  };
  const openPlanned = (item: PlannedTask, rect: DOMRect) => {
    setDraft(null);
    setMenu(null);
    setPeek({ kind: 'planned', planned: item, anchor: rect });
  };
  const openDraft = (dueAt: string, rect: DOMRect) => {
    if (!dismissing.current) {
      setPeek(null);
      setMenu(null);
      setDraft({ dueAt, anchor: rect });
    }
  };
  const openMenu: ItemMenuHandler = (item, point, rect) => {
    setPeek(null);
    setDraft(null);
    setMenu({ item, x: point.x, y: point.y, anchor: rect });
  };

  const move = (step: number) => {
    setAnchor((current) =>
      view === 'week' ? addDays(current, step * 7) : addMonths(current, step),
    );
  };

  return (
    <div className="tasks-page">
      <TasksToolbar
        userId={props.userId}
        view={view}
        anchor={anchor}
        rangeTitle={view === 'week' ? rangeTitle(days) : view === 'month' ? monthTitle(anchor) : undefined}
        hourHint={view === 'week' ? `${hourLabel(range.start)} – ${hourLabel(range.end)}` : undefined}
        count={view === 'list' ? listTasks.length : visibleCount}
        countLabel={view === 'week' ? 'việc trong tuần' : view === 'month' ? 'việc trong tháng' : 'việc'}
        scope={scope}
        rooms={roomList}
        roomIds={roomIds}
        onMove={move}
        onToday={() => setAnchor(new Date())}
        onJump={(day) => {
          setAnchor(day);
          if (!isCalendar) {
            filters.setView('week');
          }
        }}
        onView={filters.setView}
        onScope={filters.setScope}
        onRoomIds={filters.setRoomIds}
        onAdd={() => props.onAssign()}
      />
      <TaskLegend
        counts={counts}
        statuses={isCalendar ? CALENDAR_STATUSES : LIST_STATUSES}
        hidden={hiddenStatuses}
        onToggle={filters.toggleStatus}
      />
      <div className="tasks-main" onScrollCapture={closeOverlays}>
        {main.error ? (
          <Typography.Text type="danger">
            {errorText(main.error, 'Không tải được công việc.')}
          </Typography.Text>
        ) : main.isLoading ? (
          <Spin size="small" />
        ) : isCalendar ? (
          <>
            {view === 'week' ? (
              <TaskWeekView
                days={days}
                items={calendarItems}
                range={range}
                draftDue={draft?.dueAt}
                onOpen={openTask}
                onOpenPlanned={openPlanned}
                onCreate={openDraft}
                onMenu={openMenu}
              />
            ) : (
              <TaskCalendar
                anchor={anchor}
                items={calendarItems}
                draftDue={draft?.dueAt}
                onOpen={openTask}
                onOpenPlanned={openPlanned}
                onCreate={(day, rect) => openDraft(presetDue(day, new Date()), rect)}
                onMenu={openMenu}
              />
            )}
            {noDueTasks.length > 0 ? (
              <section className="tasks-nodue">
                <h3>Chưa có hạn ({noDueTasks.length})</h3>
                <div className="tasks-nodue-list">
                  {noDueTasks.map((task) => (
                    <TaskChip key={task.id} task={task} onOpen={openTask} onMenu={openMenu} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <TaskList tasks={listTasks} userId={props.userId} onOpenTask={props.onOpenTask} />
        )}
      </div>
      {peek ? (
        <AnchoredPopover
          key={
            peek.kind === 'task'
              ? `${peek.task.id}:${peek.editDue ? 'due' : ''}`
              : `${peek.planned.seriesId}:${peek.planned.dueAt}`
          }
          anchor={peek.anchor}
          onClose={closeOverlays}
          onClickOutside={dismissOverlays}
        >
          {peek.kind === 'task' && peekTask ? (
            <TaskPeek
              task={peekTask}
              userId={props.userId}
              editDue={peek.editDue}
              onClose={closeOverlays}
              onOpenInChat={(task) => {
                closeOverlays();
                props.onOpenTask(task);
              }}
            />
          ) : peek.kind === 'planned' ? (
            <PlannedPeek
              planned={peek.planned}
              userId={props.userId}
              onClose={closeOverlays}
              onStopped={() => {
                void queryClient.invalidateQueries({ queryKey: queryKeys.taskLists });
              }}
            />
          ) : null}
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
      {menu ? (
        <TaskContextMenu
          key={`${menu.x}:${menu.y}`}
          item={menu.item}
          x={menu.x}
          y={menu.y}
          userId={props.userId}
          onClose={closeMenu}
          onOpenDetail={(options) => {
            if (menu.item.kind === 'task') {
              setPeek({ kind: 'task', task: menu.item.task, anchor: menu.anchor, editDue: options?.editDue });
            } else {
              setPeek({ kind: 'planned', planned: menu.item.planned, anchor: menu.anchor });
            }
          }}
          onOpenInChat={props.onOpenTask}
          onSeriesStopped={() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.taskLists });
          }}
        />
      ) : null}
    </div>
  );
}
