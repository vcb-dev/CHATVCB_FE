import {
  LockOutlined,
  MailOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Switch,
  Typography,
  message,
} from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { FormField } from '@/components/FormField';
import { UserAvatar } from '@/components/UserAvatar';
import { BlockedUsers } from './BlockedUsers';
import { can, P } from '@/lib/access';
import { avatarCoverGradient } from '@/lib/avatar';
import { compressImage } from '@/lib/image';
import { notifyGranted, toggleNotify } from '@/lib/notify';
import type { User } from '@/types';

type Props = {
  open: boolean;
  user: User;
  onClose: () => void;
  onUpdated: (payload: { user: User }) => void;
  /** Bỏ chặn từ danh sách "Người đã chặn" (useBlockUser.setBlocked). */
  onUnblock?: (userId: string) => Promise<boolean>;
};

type FormValues = {
  name: string;
  currentPassword?: string;
  password?: string;
};

export function ProfileDrawer({ open, user, onClose, onUpdated, onUnblock }: Props) {
  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({ mode: 'onChange' });
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  // Tải lại mỗi lần mở (staleTime 0): admin vừa cấp/thu quyền đổi tên thì có hiệu lực ngay
  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me(),
    enabled: open,
    staleTime: 0,
  });
  // Ảnh vừa chọn hiện ngay trong lúc tải lên; lỗi thì quay về ảnh cũ
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fresh = meQuery.data ?? user;
  const profile = avatarPreview ? { ...fresh, avatarUrl: avatarPreview } : fresh;
  const [notifyOn, setNotifyOn] = useState(notifyGranted);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      return;
    }
    reset({
      name: user.name,
      currentPassword: '',
      password: '',
    });
  }, [open, user, reset]);

  const freshName = meQuery.data?.name;
  useEffect(() => {
    if (open && freshName) {
      setValue('name', freshName);
    }
  }, [open, freshName, setValue]);

  const canRename = can(profile, P.profile.rename);

  async function onFinish(values: FormValues) {
    setLoading(true);
    try {
      // Email do admin cấp nên không gửi lên; chỉ đổi tên (khi được phép) và mật khẩu
      const payload: {
        name?: string;
        password?: string;
        currentPassword?: string;
      } = {};
      const nextName = values.name.trim();
      if (canRename && nextName && nextName !== profile.name) {
        payload.name = nextName;
      }
      if (values.password?.trim()) {
        payload.password = values.password.trim();
        payload.currentPassword = values.currentPassword?.trim();
      }
      if (!payload.name && !payload.password) {
        message.info('Chưa có thay đổi nào.');
        setIsEditing(false);
        return;
      }
      const result = await api.updateProfile(payload);
      queryClient.setQueryData(queryKeys.me, result.user);
      onUpdated(result);
      reset({
        name: result.user.name,
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
    setAvatarPreview(preview);
    try {
      const result = await api.uploadMyAvatar(await compressImage(file, 800));
      queryClient.setQueryData(queryKeys.me, result.user);
      onUpdated(result);
      message.success('Đã đổi ảnh đại diện.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được ảnh.');
    } finally {
      setAvatarPreview(null);
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
      <div
        className="profile-cover"
        style={{ background: avatarCoverGradient(profile.name) }}
      />
      <div className="profile-head">
        <UserAvatar
          size={80}
          src={profile.avatarUrl}
          name={profile.name}
          showZoomHint
          framed
          onUpload={(file) => void onAvatar(file)}
          uploadTitle="Đổi ảnh đại diện"
          style={{ fontSize: 28, fontWeight: 700 }}
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
                Báo tin nhắn và cuộc gọi khi đang ở tab khác hoặc đã đóng app.
              </Typography.Paragraph>
            </div>
            <Switch
              checked={notifyOn}
              onChange={(checked) => {
                setNotifyOn(checked);
                void toggleNotify(checked).then((on) => {
                  setNotifyOn(on);
                  if (checked && !on) {
                    message.warning(
                      'Hãy cho phép thông báo trong cài đặt trình duyệt / macOS.',
                    );
                  }
                });
              }}
            />
          </div>

          {onUnblock ? (
            <>
              <Divider style={{ margin: '14px 0' }} />
              <BlockedUsers open={open} onUnblock={onUnblock} />
            </>
          ) : null}

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
          layout="vertical"
          onFinish={() => void handleSubmit(onFinish)()}
          requiredMark={false}
          style={{ marginTop: 8 }}
        >
          <FormField
            control={control}
            name="name"
            label="Họ tên"
            rules={{ required: 'Nhập họ tên' }}
            extra={canRename ? undefined : 'Admin chưa cho phép bạn tự đổi tên.'}
          >
            <Input prefix={<UserOutlined />} autoComplete="name" disabled={!canRename} />
          </FormField>
          <Form.Item label="Email" extra="Email do admin cấp, liên hệ admin nếu cần đổi.">
            <Input value={profile.email ?? ''} disabled prefix={<MailOutlined />} />
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
          <FormField control={control} name="currentPassword" style={{ marginTop: 8 }}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu hiện tại"
              autoComplete="current-password"
            />
          </FormField>
          <FormField
            control={control}
            name="password"
            rules={{ minLength: { value: 6, message: 'Mật khẩu mới tối thiểu 6 ký tự' } }}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu mới"
              autoComplete="new-password"
            />
          </FormField>
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
