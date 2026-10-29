import { Avatar } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { RoomMember } from '@/types';
import type { Receipt } from '../utils/seen';

function Column({ title, members, empty }: { title: string; members: RoomMember[]; empty: string }) {
  return (
    <section className="receipt-col">
      <h4>
        <b>{members.length}</b> {title}
      </h4>
      {members.length === 0 ? (
        <p className="receipt-empty">{empty}</p>
      ) : (
        <ul>
          {members.map((member) => {
            const name = member.displayName || member.name;
            return (
              <li key={member.id} title={name}>
                <Avatar
                  size={28}
                  className="avatar-initials"
                  src={member.avatarUrl ? fileSrc(member.avatarUrl) : undefined}
                  style={{ background: avatarColor(name) }}
                >
                  {initials(name)}
                </Avatar>
                <span>{name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Nội dung hộp "Đã đọc | Chưa đọc" của một tin mình gửi trong nhóm. */
export function ReadReceiptList({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt-pop">
      <Column title="Đã đọc" members={receipt.read} empty="Chưa có ai" />
      <Column title="Chưa đọc" members={receipt.unread} empty="Ai cũng đã đọc" />
    </div>
  );
}
