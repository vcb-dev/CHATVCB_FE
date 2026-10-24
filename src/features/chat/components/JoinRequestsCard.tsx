import { UserAddOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, message } from 'antd';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room, RoomMember } from '@/types';
import { errorText } from '@/lib/errors';

interface JoinRequestsCardProps {
  room: Room;
  onMembersUpdated: (members: RoomMember[]) => void;
}

export function JoinRequestsCard({ room, onMembersUpdated }: JoinRequestsCardProps) {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: queryKeys.joinRequests(room.id),
    queryFn: () => api.joinRequests(room.id),
    enabled: Boolean(room.id && room.canManage),
  });

  if (!room.canManage || requests.length === 0) {
    return null;
  }

  const handleApprove = async (userId: string) => {
    try {
      const next = await api.approveRequest(room.id, userId);
      onMembersUpdated(next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(room.id) });
      message.success('Đã duyệt thành viên.');
    } catch (err) {
      message.error(errorText(err, 'Không duyệt được yêu cầu.'));
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await api.rejectRequest(room.id, userId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests(room.id) });
      message.success('Đã từ chối yêu cầu.');
    } catch (err) {
      message.error(errorText(err, 'Không từ chối được yêu cầu.'));
    }
  };

  return (
    <div className="group-card">
      <div className="group-settings-header">
        <span className="group-ico">
          <UserAddOutlined />
        </span>
        <span className="group-row-text">
          <strong>Yêu cầu tham gia ({requests.length})</strong>
        </span>
      </div>
      <div className="join-requests-list">
        {requests.map((req) => (
          <div key={req.userId} className="join-request-row">
            <Avatar
              size={36}
              src={req.avatarUrl ? fileSrc(req.avatarUrl) : undefined}
              style={{ background: avatarColor(req.name) }}
            >
              {initials(req.name)}
            </Avatar>
            <div className="join-request-info">
              <strong>{req.name}</strong>
              <small>
                {req.invitedByName ? `Đề xuất bởi ${req.invitedByName}` : 'Tự xin qua link'}
              </small>
            </div>
            <div className="join-request-actions">
              <Button
                type="primary"
                size="small"
                onClick={() => void handleApprove(req.userId)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                onClick={() => void handleReject(req.userId)}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
