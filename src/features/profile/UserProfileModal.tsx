import { useEffect, useState } from 'react';
import { MailOutlined, MessageOutlined, TeamOutlined } from '@ant-design/icons';
import { Avatar, Button, Modal, Spin, Typography, message as antMessage } from 'antd';
import { api, fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/theme';
import type { DirectoryUser, Room } from '@/types';

export function UserProfileModal(props: {
  open: boolean;
  userId: string | null;
  currentUserId: string;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
}) {
  const [profile, setProfile] = useState<DirectoryUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!props.open || !props.userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void api
      .user(props.userId)
      .then((res) => {
        if (!cancelled) {
          setProfile(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          antMessage.error(
            err instanceof Error ? err.message : 'Không tải được hồ sơ.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.open, props.userId]);

  async function handleDirectChat() {
    if (!profile) {
      return;
    }
    setMessaging(true);
    try {
      const room = await api.createDirectRoom(profile.id);
      props.onOpenRoom(room);
      props.onClose();
    } catch (err) {
      antMessage.error(
        err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.',
      );
    } finally {
      setMessaging(false);
    }
  }

  const isSelf = profile ? profile.id === props.currentUserId : false;

  return (
    <Modal
      title="Hồ sơ người dùng"
      open={props.open}
      onCancel={props.onClose}
      destroyOnHidden
      width={380}
      footer={[
        <Button key="close" onClick={props.onClose}>
          Đóng
        </Button>,
        profile && !isSelf ? (
          <Button
            key="chat"
            type="primary"
            icon={<MessageOutlined />}
            loading={messaging}
            onClick={() => void handleDirectChat()}
          >
            Nhắn tin
          </Button>
        ) : null,
      ]}
    >
      {loading ? (
        <div className="user-profile-modal-loading">
          <Spin />
        </div>
      ) : profile ? (
        <div className="user-profile-modal-body">
          <div className="user-profile-modal-avatar">
            <Avatar
              size={72}
              className="avatar-initials"
              src={profile.avatarUrl ? fileSrc(profile.avatarUrl) : undefined}
              style={{ background: avatarColor(profile.name), fontSize: 28 }}
            >
              {initials(profile.name)}
            </Avatar>
          </div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {profile.name}
          </Typography.Title>
          <div className="user-profile-modal-meta">
            <span className="user-profile-modal-meta-item">
              <MailOutlined /> {profile.email}
            </span>
            <span className="user-profile-modal-meta-item">
              <TeamOutlined /> Team {profile.team}
            </span>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
