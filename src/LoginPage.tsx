import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { api } from './api';
import type { User } from './types';

type Props = {
  onLoggedIn: (payload: { token: string; user: User }) => void;
};

type FormValues = {
  name?: string;
  email: string;
  password: string;
};

export function LoginPage({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onFinish(values: FormValues) {
    setError('');
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(values.email.trim(), values.password)
          : await api.register(values.name?.trim() || '', values.email.trim(), values.password);
      onLoggedIn(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <Card className="login-card" variant="borderless">
        <Typography.Text className="eyebrow">CHATVCB</Typography.Text>
        <Typography.Title level={2} style={{ marginTop: 8 }}>
          {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Mỗi team chỉ vào phòng của team đó. Sale: sale1 / sale2. Traffic: traffic1 /
          traffic2. Mật khẩu Password123.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          {mode === 'register' ? (
            <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
              <Input size="large" placeholder="Traffic Ba" />
            </Form.Item>
          ) : null}
          <Form.Item
            name="email"
            label="Email hoặc tài khoản"
            rules={[{ required: true, message: 'Nhập tài khoản' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="traffic1 hoặc sale1"
              autoFocus
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Password123" />
          </Form.Item>
          {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </Button>
          <Button
            type="link"
            block
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
