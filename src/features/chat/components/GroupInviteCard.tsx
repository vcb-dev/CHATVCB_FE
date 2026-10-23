import { LinkOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { copyText } from '@/lib/clipboard';
import type { Room } from '@/types';
import { inviteUrl } from '../utils/invite';

interface GroupInviteCardProps {
  room: Room;
}

export function GroupInviteCard({ room }: GroupInviteCardProps) {
  if (!room.canManage) {
    return null;
  }

  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({
    queryKey: queryKeys.invite(room.id),
    queryFn: () => api.getInvite(room.id),
    enabled: Boolean(room.id && room.canManage),
  });

  const token = data?.token ?? null;
  const url = token ? inviteUrl(token) : '';

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await api.resetInvite(room.id);
      queryClient.setQueryData(queryKeys.invite(room.id), res);
      message.success('Đã tạo link mời.');
    } catch (err: any) {
      message.error(err?.message || 'Không tạo được link mời.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyText(url);
      message.success('Đã sao chép link mời.');
    } catch (err: any) {
      message.error(err?.message || 'Không sao chép được link.');
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Đổi link mời?',
      content: 'Link cũ sẽ không dùng được nữa.',
      okText: 'Đổi link',
      onOk: async () => {
        try {
          const res = await api.resetInvite(room.id);
          queryClient.setQueryData(queryKeys.invite(room.id), res);
          message.success('Đã đổi link mời.');
        } catch (err: any) {
          message.error(err?.message || 'Không đổi được link mời.');
        }
      },
    });
  };

  const handleDisable = () => {
    Modal.confirm({
      title: 'Tắt link mời?',
      content: 'Mọi người sẽ không thể tham gia nhóm bằng link này nữa.',
      okText: 'Tắt link',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.disableInvite(room.id);
          queryClient.setQueryData(queryKeys.invite(room.id), { token: null });
          message.success('Đã tắt link mời.');
        } catch (err: any) {
          message.error(err?.message || 'Không tắt được link mời.');
        }
      },
    });
  };

  return (
    <div className="group-card">
      <div className="group-settings-header">
        <span className="group-ico">
          <LinkOutlined />
        </span>
        <span className="group-row-text">
          <strong>Link mời vào nhóm</strong>
        </span>
      </div>
      {!token ? (
        <div style={{ padding: '0 14px 12px' }}>
          <Button type="primary" block loading={loading} onClick={handleCreate}>
            Tạo link mời
          </Button>
        </div>
      ) : (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input readOnly value={url} />
          <div className="invite-link-row">
            <Button type="primary" onClick={handleCopy}>
              Sao chép
            </Button>
            <Button onClick={handleReset}>
              Đổi link
            </Button>
            <Button danger onClick={handleDisable}>
              Tắt link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
