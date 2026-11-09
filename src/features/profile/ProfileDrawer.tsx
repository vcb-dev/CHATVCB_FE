import {
  CameraOutlined,
  LockOutlined,
  MailOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Switch,
  Typography,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { api, fileSrc } from '@/api/client';
import { compressImage } from '@/lib/image';
import { notifyEnabled, requestNotifyPermission, setNotifyEnabled } from '@/lib/notify';
import { avatarColor, initials } from '@/lib/avatar';
import type { User } from '@/types';

type Props = {
  open: boolean;
  user: User;
  onClose: () => void;
  onUpdated: (payload: { user: User }) => void;
};

type FormValues = {
  name: string;
  email: string;
  currentPassword?: string;
  password?: string;
};

export function ProfileDrawer({ open, user, onClose, onUpdated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(user);
  const [notifyOn, setNotifyOn] = useState(notifyEnabled);
  const [isEditing, setIsEditing] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      return;
    }
    setProfile(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email ?? '',
      currentPassword: '',
      password: '',
    });
    void api
      .me()
      .then((next) => {
        setProfile(next);
        form.setFieldsValue({ name: next.name, email: next.email ?? '' });
      })
      .catch(() => undefined);
  }, [open, user, form]);

  async function onFinish(values: FormValues) {
    setLoading(true);
    try {
      const payload: {
        name?: string;
        email?: string;
        password?: string;
        currentPassword?: string;
      } = {};
      const nextName = values.name.trim();
      const nextEmail = values.email.trim();
      if (nextName && nextName !== profile.name) {
        payload.name = nextName;
      }
      if (nextEmail && nextEmail !== (profile.email ?? '')) {
        payload.email = nextEmail;
      }
      if (values.password?.trim()) {
        payload.password = values.password.trim();
        payload.currentPassword = values.currentPassword?.trim();
      }
      if (!payload.name && !payload.email && !payload.password) {
        message.info('Chưa có thay đổi nào.');
        setIsEditing(false);
        return;
      }
      const result = await api.updateProfile(payload);
      setProfile(result.user);
      onUpdated(result);
      form.setFieldsValue({
        name: result.user.name,
        email: result.user.email ?? '',
        currentPassword: '',
        password: '',
      });
      message.success('Đã lưu thông tin cá nhân.');
      setIsEditing(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được.');
    } finally {
      setLoading(false);
    }
  }

  async function onAvatar(file: File) {
    const preview = URL.createObjectURL(file);
    setProfile((current) => ({ ...current, avatarUrl: preview }));
    try {
      const result = await api.uploadMyAvatar(await compressImage(file, 400));
      setProfile(result.user);
      onUpdated(result);
      message.success('Đã đổi ảnh đại diện.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được ảnh.');
    } finally {
      URL.revokeObjectURL(preview);
    }
  }

  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN')
    : '';

  return (
    <Modal
      title="Thông tin tài khoản"
      open={open}
      onCancel={onClose}
      width={400}
      destroyOnHidden
      footer={null}
      className="profile-modal"
    >
      <div className="profile-cover" />
      <div className="profile-head">
        <button
          type="button"
          className="user-avatar-btn"
          title="Đổi ảnh đại diện"
          onClick={() => avatarRef.current?.click()}
        >
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
          <span className="user-cam">
            <CameraOutlined />
          </span>
        </button>
        <input
          ref={avatarRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void onAvatar(file);
            }
          }}
        />
        <h3 className="profile-name">{profile.name}</h3>
      </div>

      {!isEditing ? (
        <>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{profile.email ?? '—'}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Phòng ban</span>
              <span className="profile-info-value">
                {profile.team ? `Team ${profile.team}` : '—'}
              </span>
            </div>
            {joined ? (
              <div className="profile-info-row">
                <span className="profile-info-label">Ngày tham gia</span>
                <span className="profile-info-value">{joined}</span>
              </div>
            ) : null}
          </div>

          <Divider style={{ margin: '14px 0' }} />

          <div className="profile-notify">
            <div>
              <Typography.Text strong style={{ fontSize: 13 }}>
                Thông báo tin nhắn
              </Typography.Text>
              <Typography.Paragraph
                type="secondary"
                style={{ margin: 0, fontSize: 12 }}
              >
                Hiện thông báo khi có tin mới ở tab khác.
              </Typography.Paragraph>
            </div>
            <Switch
              checked={notifyOn}
              onChange={(checked) => {
                setNotifyEnabled(checked);
                setNotifyOn(checked);
                if (checked) {
                  void requestNotifyPermission().then((status) => {
                    if (status === 'denied') {
                      message.warning(
                        'Hãy cho phép thông báo trong cài đặt trình duyệt / macOS.',
                      );
                    }
                  });
                }
              }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <Button
              type="primary"
              block
              onClick={() => setIsEditing(true)}
            >
              Cập nhật
            </Button>
          </div>
        </>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[{ required: true, message: 'Nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} autoComplete="email" />
          </Form.Item>
          <Form.Item label="Phòng ban">
            <Input
              value={profile.team ? `Team ${profile.team}` : ''}
              disabled
              prefix={<TeamOutlined />}
            />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đổi mật khẩu (không bắt buộc)
          </Typography.Text>
          <Form.Item name="currentPassword" style={{ marginTop: 8 }}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu hiện tại"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ min: 6, message: 'Mật khẩu mới tối thiểu 6 ký tự' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu mới"
              autoComplete="new-password"
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button style={{ flex: 1 }} onClick={() => setIsEditing(false)}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ flex: 1 }}
              loading={loading}
            >
              Lưu
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
