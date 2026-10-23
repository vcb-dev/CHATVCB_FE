import { MoreOutlined } from '@ant-design/icons';
import { Dropdown, Modal, message, type MenuProps } from 'antd';
import { api } from '@/api/client';
import type { Room, RoomMember } from '@/types';

interface MemberActionsProps {
  room: Room;
  member: RoomMember;
  currentUserId: string;
  onMembersUpdated: (members: RoomMember[]) => void;
  onRemove: (member: RoomMember) => void;
}

export function MemberActions({
  room,
  member,
  currentUserId,
  onMembersUpdated,
  onRemove,
}: MemberActionsProps) {
  if (member.id === currentUserId) {
    return null;
  }

  const myRole = room.myRole ?? 'member';
  const targetRole = member.role ?? 'member';
  const targetName = member.displayName || member.nickname || member.name;

  const items: MenuProps['items'] = [];

  if (myRole === 'owner') {
    if (targetRole === 'admin') {
      items.push({
        key: 'demote',
        label: 'Bãi nhiệm phó nhóm',
        onClick: async () => {
          try {
            const next = await api.setMemberRole(room.id, member.id, 'member');
            onMembersUpdated(next);
            message.success('Đã bãi nhiệm phó nhóm.');
          } catch (err: any) {
            message.error(err?.message || 'Có lỗi xảy ra.');
          }
        },
      });
    } else {
      items.push({
        key: 'promote',
        label: 'Bổ nhiệm phó nhóm',
        onClick: async () => {
          try {
            const next = await api.setMemberRole(room.id, member.id, 'admin');
            onMembersUpdated(next);
            message.success('Đã bổ nhiệm phó nhóm.');
          } catch (err: any) {
            message.error(err?.message || 'Có lỗi xảy ra.');
          }
        },
      });
    }

    items.push({
      key: 'transfer',
      label: 'Chuyển quyền trưởng nhóm',
      onClick: () => {
        Modal.confirm({
          title: `Chuyển quyền trưởng nhóm cho ${targetName}?`,
          content: 'Bạn sẽ trở thành phó nhóm.',
          okText: 'Chuyển quyền',
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              const next = await api.transferOwner(room.id, member.id);
              onMembersUpdated(next);
              message.success('Đã chuyển quyền trưởng nhóm.');
            } catch (err: any) {
              message.error(err?.message || 'Có lỗi xảy ra.');
            }
          },
        });
      },
    });

    items.push({
      key: 'remove',
      danger: true,
      label: 'Xóa khỏi nhóm',
      onClick: () => {
        onRemove(member);
      },
    });
  } else if (myRole === 'admin') {
    if (targetRole === 'member' && member.id !== room.createdById) {
      items.push({
        key: 'remove',
        danger: true,
        label: 'Xóa khỏi nhóm',
        onClick: () => {
          onRemove(member);
        },
      });
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className="group-member-more"
        title="Thao tác"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreOutlined />
      </button>
    </Dropdown>
  );
}
