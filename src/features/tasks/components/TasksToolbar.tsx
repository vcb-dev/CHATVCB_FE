import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Segmented, Select } from 'antd';
import { useRef, type ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { taskRoomLabel } from '@/lib/tasks';
import type { TaskRoom, TaskScope } from '@/types';
import type { TaskView } from '../hooks/useTaskFilters';
import { dateKey } from '../utils/calendar';

const VIEWS: { value: TaskView; label: string }[] = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'list', label: 'Danh sách' },
];

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: 'all', label: 'Tất cả việc' },
  { value: 'assigned', label: 'Việc của tôi' },
  { value: 'created', label: 'Tôi đã giao' },
];

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="tasks-field">
      <span className="tasks-field-label">{props.label}</span>
      {props.children}
    </div>
  );
}

export function TasksToolbar(props: {
  userId: string;
  view: TaskView;
  anchor: Date;
  /** Dải ngày đang xem; không có ở chế độ danh sách. */
  rangeTitle?: string;
  scope: TaskScope;
  rooms: TaskRoom[];
  roomIds: string[];
  onJump: (day: Date) => void;
  onView: (view: TaskView) => void;
  onScope: (scope: TaskScope) => void;
  onRoomIds: (roomIds: string[]) => void;
  onAdd: () => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = pickerRef.current;
    try {
      input?.showPicker();
    } catch {
      input?.focus();
    }
  };

  const meta = props.rangeTitle ? (
    <span className="tasks-range">
      <button type="button" className="tasks-range-button" onClick={openPicker}>
        {props.rangeTitle}
        <DownOutlined />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-label="Chọn ngày"
        className="tasks-range-input"
        value={dateKey(props.anchor)}
        onChange={(event) => {
          const [y, m, d] = event.target.value.split('-').map(Number);
          if (y && m && d) {
            props.onJump(new Date(y, m - 1, d));
          }
        }}
      />
    </span>
  ) : (
    <span className="tasks-range-text">Mọi việc của bạn</span>
  );

  return (
    <PageHeader
      title="Công việc"
      meta={meta}
      actions={
        <Button type="primary" icon={<PlusOutlined />} className="tasks-add" onClick={props.onAdd}>
          Giao việc mới
        </Button>
      }
    >
      <Field label="Chế độ xem">
        <Segmented<TaskView>
          className="tasks-page-view"
          options={VIEWS}
          value={props.view}
          onChange={props.onView}
        />
      </Field>
      <Field label="Phạm vi">
        <Select<TaskScope>
          className="tasks-scope"
          options={SCOPES}
          value={props.scope}
          onChange={props.onScope}
        />
      </Field>
      <Field label="Nhóm">
        <Select<string[]>
          mode="multiple"
          allowClear
          className="tasks-rooms-filter"
          placeholder="Tất cả nhóm"
          maxTagCount="responsive"
          showSearch={{ optionFilterProp: 'label' }}
          value={props.roomIds}
          onChange={props.onRoomIds}
          options={props.rooms.map((room) => ({
            value: room.roomId,
            label: taskRoomLabel(room, props.userId),
          }))}
          notFoundContent="Chưa có nhóm nào có việc"
        />
      </Field>
    </PageHeader>
  );
}
