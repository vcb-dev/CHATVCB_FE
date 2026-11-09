import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { Room, RoomMember } from '@/types';
import { GroupSettingsCard } from './GroupSettingsCard';
import { GroupInviteCard } from './GroupInviteCard';
import { JoinRequestsCard } from './JoinRequestsCard';

export function GroupManageView(props: {
  room: Room;
  onBack: () => void;
  onRoomUpdated: (room: Room) => void;
  onMembersUpdated: (members: RoomMember[]) => void;
}) {
  return (
    <div className="group-manage">
      <div className="group-manage-head">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={props.onBack}
          aria-label="Quay lại"
          className="group-manage-back"
        />
        <strong>Quản lý nhóm</strong>
      </div>
      <div className="group-manage-body">
        <GroupSettingsCard
          room={props.room}
          onRoomUpdated={props.onRoomUpdated}
        />
        <GroupInviteCard room={props.room} />
        <JoinRequestsCard
          room={props.room}
          onMembersUpdated={props.onMembersUpdated}
        />
      </div>
    </div>
  );
}
