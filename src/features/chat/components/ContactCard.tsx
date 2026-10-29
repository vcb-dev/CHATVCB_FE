import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, message as antMessage } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { avatarColor, initials } from '@/lib/avatar';
import type { Room } from '@/types';

export function ContactCard(props: {
  userId: string;
  currentUserId: string;
  onViewProfile: (userId: string) => void;
  onOpenRoom: (room: Room) => void;
}) {
  const [opening, setOpening] = useState(false);
  const { data, isError } = useQuery({
    queryKey: queryKeys.user(props.userId),
    queryFn: () => api.user(props.userId),
    staleTime: 5 * 60_000,
  });

  if (isError) {
    return <p className="rich-fallback">Không tải được danh thiếp.</p>;
  }
  if (!data) {
    return <div className="contact-card contact-card-loading" />;
  }

  async function openDirect() {
    setOpening(true);
    try {
      props.onOpenRoom(await api.createDirectRoom(props.userId));
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="contact-card">
      <div className="contact-card-head">
        <Avatar
          size={44}
          className="avatar-initials"
          src={data.avatarUrl ? fileSrc(data.avatarUrl) : undefined}
          style={{ background: avatarColor(data.name) }}
        >
          {initials(data.name)}
        </Avatar>
        <div className="contact-card-info">
          <strong>{data.name}</strong>
          <span>{data.email}</span>
          <span>Team {data.team}</span>
        </div>
      </div>
      <div className="contact-card-actions">
        <Button size="small" icon={<UserOutlined />} onClick={() => props.onViewProfile(props.userId)}>
          Xem hồ sơ
        </Button>
        {props.userId !== props.currentUserId ? (
          <Button size="small" icon={<MessageOutlined />} loading={opening} onClick={() => void openDirect()}>
            Nhắn tin
          </Button>
        ) : null}
      </div>
    </div>
  );
}
