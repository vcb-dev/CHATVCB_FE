import { PlusOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons';
import { Avatar, Input, Modal } from 'antd';
import { useMemo, useState } from 'react';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room, RoomMember } from '@/types';
import { matchMember, sortByRole } from '../utils/members';
import { MemberActions } from './MemberActions';
import { RoleTag } from './RoleTag';

const PREVIEW_COUNT = 5;

type RowProps = {
  room: Room;
  member: RoomMember;
  currentUserId: string;
  onPick: (member: RoomMember) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
  onRemove: (member: RoomMember) => void;
};

function MemberRow({ room, member, currentUserId, onPick, onMembersUpdated, onRemove }: RowProps) {
  const label = member.displayName || member.name;
  return (
    <div className="group-member-wrap">
      <button type="button" className="group-member" onClick={() => onPick(member)}>
        <Avatar
          size={40}
          src={member.avatarUrl ? fileSrc(member.avatarUrl) : undefined}
          style={{ background: avatarColor(label) }}
        >
          {initials(label)}
        </Avatar>
        <span className="group-member-info">
          <strong className="group-member-name">
            <span>{label}</span>
            <RoleTag role={member.role} />
          </strong>
          <small>@{member.handle}</small>
        </span>
        <RightOutlined className="chev" />
      </button>
      <MemberActions
        room={room}
        member={member}
        currentUserId={currentUserId}
        onMembersUpdated={onMembersUpdated}
        onRemove={onRemove}
      />
    </div>
  );
}

type Props = {
  room: Room;
  members: RoomMember[];
  currentUserId: string;
  open: boolean;
  onToggle: () => void;
  /** null khi người xem không được thêm/đề xuất thành viên. */
  addLabel: string | null;
  onAdd: () => void;
  onPick: (member: RoomMember) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
  onRemove: (member: RoomMember) => void;
};

export function GroupMembersCard({
  room,
  members,
  currentUserId,
  open,
  onToggle,
  addLabel,
  onAdd,
  onPick,
  onMembersUpdated,
  onRemove,
}: Props) {
  const [allOpen, setAllOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => sortByRole(members), [members]);
  const matched = useMemo(() => sorted.filter((member) => matchMember(member, query)), [sorted, query]);

  const rowProps = { room, currentUserId, onPick, onMembersUpdated, onRemove };

  function closeAll() {
    setAllOpen(false);
    setQuery('');
  }

  return (
    <div className="group-card">
      <button type="button" className="group-row" onClick={onToggle}>
        <span className="group-ico">
          <TeamOutlined />
        </span>
        <span className="group-row-text">
          <strong>Thành viên</strong>
          <small>{members.length} người</small>
        </span>
        <RightOutlined className={open ? 'chev open' : 'chev'} />
      </button>
      {open ? (
        <div className="group-list">
          {addLabel ? (
            <button type="button" className="group-member group-add-btn" onClick={onAdd}>
              <span className="group-file-ico">
                <PlusOutlined />
              </span>
              <span className="group-member-info">
                <strong>{addLabel}</strong>
              </span>
            </button>
          ) : null}
          {sorted.slice(0, PREVIEW_COUNT).map((member) => (
            <MemberRow key={member.id} member={member} {...rowProps} />
          ))}
          {members.length > PREVIEW_COUNT ? (
            <button type="button" className="group-members-more" onClick={() => setAllOpen(true)}>
              Xem tất cả {members.length} thành viên
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Thấp hơn mặc định 1000 để "Đổi biệt danh", "Xem hồ sơ", hộp xác nhận mở từ đây luôn nằm trên,
          bất kể portal nào được gắn vào body trước. */}
      <Modal
        title={`Thành viên (${members.length})`}
        open={allOpen}
        onCancel={closeAll}
        footer={null}
        width={440}
        zIndex={999}
      >
        <Input.Search
          placeholder="Tìm theo tên, biệt danh, @handle..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
          className="members-modal-search"
        />
        {matched.length ? (
          <div className="members-modal-list">
            {matched.map((member) => (
              <MemberRow key={member.id} member={member} {...rowProps} />
            ))}
          </div>
        ) : (
          <p className="members-modal-empty">Không có ai khớp</p>
        )}
      </Modal>
    </div>
  );
}
