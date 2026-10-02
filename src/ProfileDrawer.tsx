import { LockOutlined, MailOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Divider, Drawer, Form, Input, Switch, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from './api';
import { notifyEnabled, requestNotifyPermission, setNotifyEnabled } from './notify';
import { avatarColor, initials } from './theme';
import type { User } from './types';

type Props = {
  open: boolean;
  user: User;
  onClose: () => void;
  onUpdated: (payload: { token: string; user: User }) => void;
};

type FormValues = {
  name: string;
  currentPassword?: string;
  password?: string;
};

export function ProfileDrawer({ open, user, onClose, onUpdated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(user);
  const [notifyOn, setNotifyOn] = useState(notifyEnabled);

  useEffect(() => {
    if (!open) {
      return;
    }
    setProfile(user);
    form.setFieldsValue({ name: user.name, currentPassword: '', password: '' });
    void api
      .me()
      .then((next) => {
        setProfile(next);
        form.setFieldValue('name', next.name);
      })
      .catch(() => undefined);
  }, [open, user, form]);

  async function onFinish(values: FormValues) {
    setLoading(true);
    try {
      const payload: { name?: string; password?: string; currentPassword?: string } = {};
      if (values.name.trim() !== profile.name) {
        payload.name = values.name.trim();
      }
      if (values.password) {
        payload.password = values.password;
        payload.currentPassword = values.currentPassword;
      }
      if (!payload.name && !payload.password) {
        message.info('Chưa có thay đổi nào.');
        return;
      }
      const result = await api.updateProfile(payload);
      setProfile(result.user);
      onUpdated(result);
      form.setFieldsValue({ currentPassword: '', password: '' });
      message.success('Đã lưu thông tin cá nhân.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được.');
    } finally {
      setLoading(false);
    }
  }

  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN')
    : '';

  return (
    <Drawer
      title="Thông tin cá nhân"
      open={open}
      onClose={onClose}
      width={360}
    >
      <div className="profile-head">
        <Avatar size={72} style={{ background: avatarColor(profile.name) }}>
          {initials(profile.name)}
        </Avatar>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {profile.name}
          </Typography.Title>
          <Typography.Text type="secondary">{profile.email}</Typography.Text>
        </div>
      </div>

      <div className="profile-meta">
        <span>
          <MailOutlined /> {profile.email ?? '—'}
        </span>
        <span>
          <TeamOutlined /> Team {profile.team ?? '—'}
        </span>
        {joined ? <span>Tham gia {joined}</span> : null}
      </div>

      <Divider />

      <div className="profile-notify">
        <div>
          <Typography.Text strong>Thông báo tin nhắn</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Hiện popup khi có tin mới lúc bạn đang ở tab/cửa sổ khác.
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
                  message.warning('Hãy cho phép thông báo trong cài đặt trình duyệt / macOS.');
                }
              });
            }
          }}
        />
      </div>

      <Divider />

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
          <Input size="large" prefix={<UserOutlined />} />
        </Form.Item>
        <Form.Item label="Email">
          <Input size="large" value={profile.email} disabled prefix={<MailOutlined />} />
        </Form.Item>
        <Form.Item label="Phòng ban">
          <Input size="large" value={profile.team ? `Team ${profile.team}` : ''} disabled prefix={<TeamOutlined />} />
        </Form.Item>
        <Typography.Text type="secondary">Đổi mật khẩu (không bắt buộc)</Typography.Text>
        <Form.Item name="currentPassword" style={{ marginTop: 8 }}>
          <Input.Password size="large" prefix={<LockOutlined />} placeholder="Mật khẩu hiện tại" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ min: 6, message: 'Mật khẩu mới tối thiểu 6 ký tự' }]}
        >
          <Input.Password size="large" prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          Lưu thay đổi
        </Button>
      </Form>
    </Drawer>
  );
}
