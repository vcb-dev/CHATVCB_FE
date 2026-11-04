import { DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Checkbox, Radio } from 'antd';
import { useState, type ReactNode } from 'react';
import { avatarColor } from '@/lib/avatar';
import { taskRoomLabel } from '@/lib/tasks';
import type { TaskRoom, TaskScope } from '@/types';
import { MiniCalendar } from './MiniCalendar';

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'assigned', label: 'Việc của tôi' },
  { value: 'created', label: 'Tôi đã giao' },
];

function Section(props: { title: string; extra?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="tasks-section">
      <div className="tasks-section-head">
        <button type="button" className="tasks-section-toggle" onClick={() => setOpen(!open)}>
          <span>{props.title}</span>
          {open ? <UpOutlined /> : <DownOutlined />}
        </button>
      </div>
      {open ? (
        <>
          {props.extra}
          {props.children}
        </>
      ) : null}
    </section>
  );
}

export function TasksSidebar(props: {
  userId: string;
  anchor: Date;
  scope: TaskScope;
  rooms: TaskRoom[];
  hiddenRooms: string[];
  showCancelled: boolean;
  canToggleCancelled: boolean;
  onPickDay: (day: Date) => void;
  onAdd: () => void;
  onScope: (scope: TaskScope) => void;
  onToggleRoom: (roomId: string) => void;
  onSetHiddenRooms: (roomIds: string[]) => void;
  onShowCancelled: (show: boolean) => void;
}) {
  return (
    <aside className="tasks-sidebar">
      <Button size="large" icon={<PlusOutlined />} className="tasks-add" onClick={props.onAdd}>
        Tạo
      </Button>
      <MiniCalendar anchor={props.anchor} onPick={props.onPickDay} />
      <Section title="Công việc">
        <Radio.Group
          className="tasks-scope"
          value={props.scope}
          onChange={(event) => props.onScope(event.target.value as TaskScope)}
          options={SCOPES}
        />
      </Section>
      <Section
        title="Nhóm"
        extra={
          <div className="tasks-rooms-actions">
            <button type="button" className="tasks-rooms-all" onClick={() => props.onSetHiddenRooms([])}>
              Chọn tất cả
            </button>
            <button
              type="button"
              className="tasks-rooms-none"
              onClick={() => props.onSetHiddenRooms(props.rooms.map((room) => room.roomId))}
            >
              Bỏ chọn
            </button>
          </div>
        }
      >
        <div className="tasks-rooms">
          {props.rooms.map((room) => {
            const checked = !props.hiddenRooms.includes(room.roomId);
            const color = avatarColor(room.roomId);
            return (
              <label key={room.roomId} className="tasks-room-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => props.onToggleRoom(room.roomId)}
                />
                <span
                  className={checked ? 'tasks-room-box checked' : 'tasks-room-box'}
                  style={{ borderColor: color, background: checked ? color : undefined }}
                />
                <span className="tasks-room-name">{taskRoomLabel(room, props.userId)}</span>
              </label>
            );
          })}
        </div>
      </Section>
      {props.canToggleCancelled ? (
        <Checkbox
          className="tasks-show-cancelled"
          checked={props.showCancelled}
          onChange={(event) => props.onShowCancelled(event.target.checked)}
        >
          Hiện việc đã hủy
        </Checkbox>
      ) : null}
    </aside>
  );
}
