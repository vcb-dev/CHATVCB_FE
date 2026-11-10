import { useEffect, useState } from 'react';
import { MessageOutlined, StopOutlined } from '@ant-design/icons';
import { Avatar, Button, Modal, Spin, message as antMessage } from 'antd';
import { api, fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { DirectoryUser, Room } from '@/types';

export function UserProfileModal(props: {
  open: boolean;
  userId: string | null;
  currentUserId: string;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
  onSetBlocked: (userId: string, blocked: boolean) => Promise<boolean>;
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

  async function applyBlock(blocked: boolean) {
    if (!profile || !(await props.onSetBlocked(profile.id, blocked))) {
      return;
    }
    setProfile({ ...profile, blockedByMe: blocked });
  }

  function handleBlockClick() {
    if (!profile) {
      return;
    }
    if (profile.blockedByMe) {
      void applyBlock(false);
      return;
    }
    Modal.confirm({
      title: `Chặn ${profile.name}?`,
      content:
        'Hai bạn sẽ không nhắn tin riêng được cho nhau. Trong nhóm chung vẫn nhắn bình thường.',
      okText: 'Chặn',
      okButtonProps: { danger: true },
      onOk: () => applyBlock(true),
    });
  }

  return (
    <Modal
      title="Thông tin tài khoản"
      open={props.open}
      onCancel={props.onClose}
      destroyOnHidden
      width={400}
      footer={null}
      className="profile-modal"
    >
      <div className="profile-cover" />
      {loading ? (
        <div className="user-profile-modal-loading">
          <Spin />
        </div>
      ) : profile ? (
        <div className="user-profile-modal-body">
          <div className="profile-head" style={{ marginBottom: 8 }}>
            <div className="user-avatar-btn" style={{ cursor: 'default' }}>
              <Avatar
                size={80}
                src={profile.avatarUrl ? fileSrc(profile.avatarUrl) : undefined}
                style={{
                  background: avatarColor(profile.name),
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {initials(profile.name)}
              </Avatar>
            </div>
            <h3 className="profile-name">{profile.name}</h3>
          </div>

          {!isSelf ? (
            <div
              className="user-profile-modal-actions"
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
                width: '100%',
                marginBottom: 12,
              }}
            >
              <Button
                type="primary"
                icon={<MessageOutlined />}
                loading={messaging}
                onClick={() => void handleDirectChat()}
              >
                Nhắn tin
              </Button>
              <Button
                danger={!profile.blockedByMe}
                icon={<StopOutlined />}
                onClick={handleBlockClick}
              >
                {profile.blockedByMe ? 'Bỏ chặn' : 'Chặn'}
              </Button>
            </div>
          ) : null}

          <div className="profile-info-list" style={{ width: '100%' }}>
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{profile.email}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Phòng ban</span>
              <span className="profile-info-value">Team {profile.team}</span>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
