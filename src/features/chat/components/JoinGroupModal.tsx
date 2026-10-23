import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Modal, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room } from '@/types';

interface JoinGroupModalProps {
  token: string | null;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
}

export function JoinGroupModal({ token, onClose, onOpenRoom }: JoinGroupModalProps) {
  const [requested, setRequested] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setRequested(false);
  }, [token]);

  const { data: info, error, isLoading } = useQuery({
    queryKey: queryKeys.inviteInfo(token ?? ''),
    queryFn: () => api.inviteInfo(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const handleAction = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await api.joinByInvite(token);
      if (res.status === 'joined') {
        onOpenRoom(res.room);
        onClose();
      } else if (res.status === 'requested') {
        setRequested(true);
      }
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal
      open={Boolean(token)}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
      width={380}
    >
      <div className="join-group-modal">
        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : error || !info ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#fa3e3e', fontSize: 15, marginBottom: 20 }}>
              Link mời không còn hiệu lực.
            </p>
            <Button onClick={onClose}>Đóng</Button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <Avatar
              size={64}
              src={info.avatarUrl ? fileSrc(info.avatarUrl) : undefined}
              style={{ background: avatarColor(info.name), marginBottom: 12 }}
            >
              {initials(info.name)}
            </Avatar>
            <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>{info.name}</h2>
            <p style={{ color: '#65676b', margin: '0 0 24px', fontSize: 13 }}>
              {info.memberCount} thành viên
            </p>
            {info.status === 'member' ? (
              <Button type="primary" size="large" block loading={joining} onClick={handleAction}>
                Mở nhóm
              </Button>
            ) : requested || info.status === 'requested' ? (
              <Button type="primary" size="large" block disabled>
                Đã gửi yêu cầu
              </Button>
            ) : info.joinApproval ? (
              <Button type="primary" size="large" block loading={joining} onClick={handleAction}>
                Gửi yêu cầu tham gia
              </Button>
            ) : (
              <Button type="primary" size="large" block loading={joining} onClick={handleAction}>
                Tham gia nhóm
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
