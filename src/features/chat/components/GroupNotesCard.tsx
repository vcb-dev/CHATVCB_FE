import { useState } from 'react';
import { FileTextOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { Room, RoomNote } from '@/types';
import { formatShort } from '../utils/datetime';

type GroupNotesCardProps = {
  room: Room;
  onOpen: (note: RoomNote | null) => void;
};

export function GroupNotesCard({ room, onOpen }: GroupNotesCardProps) {
  const [open, setOpen] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: queryKeys.notes(room.id),
    queryFn: () => api.notes(room.id),
    enabled: Boolean(room.id),
  });

  return (
    <div className="group-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
        }}
      >
        <button
          type="button"
          className="group-row"
          style={{ padding: 0, flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setOpen(!open)}
        >
          <span className="group-ico">
            <FileTextOutlined />
          </span>
          <span className="group-row-text">
            <strong>Ghi chú</strong>
            <small>{notes.length} ghi chú</small>
          </span>
          <RightOutlined className={open ? 'chev open' : 'chev'} />
        </button>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          style={{ marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(null);
          }}
        >
          Tạo
        </Button>
      </div>

      {open ? (
        notes.length ? (
          <div className="group-board-list" style={{ borderTop: '1px solid #f0f0f0' }}>
            {notes.map((n) => (
              <div
                key={n.id}
                className="board-row cursor-pointer"
                onClick={() => onOpen(n)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.title}
                  </div>
                  <small>
                    {n.updatedByName
                      ? `Sửa bởi ${n.updatedByName} • ${formatShort(n.updatedAt)}`
                      : `${n.creatorName} • ${formatShort(n.createdAt)}`}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '8px 12px',
              fontSize: 13,
              color: '#888',
              borderTop: '1px solid #f0f0f0',
            }}
          >
            Chưa có ghi chú nào
          </div>
        )
      ) : null}
    </div>
  );
}
