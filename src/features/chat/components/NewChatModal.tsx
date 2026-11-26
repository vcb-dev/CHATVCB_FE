import { useEffect, useState } from 'react';
import { Button, Input, Modal, Tabs, message } from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { api } from '@/api/client';
import { UserPicker } from './UserPicker';
import type { DirectoryUser, Room } from '@/types';

type GroupFormValues = { name: string; memberIds: string[] };

export function NewChatModal(props: {
  open: boolean;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
  /** Tab mở sẵn; "Tạo nhóm mới" ở Danh bạ mở thẳng tab nhóm. */
  initialTab?: 'direct' | 'group';
}) {
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<GroupFormValues>({ mode: 'onChange', defaultValues: { name: '', memberIds: [] } });
  const memberCount = useWatch({ control, name: 'memberIds' }).length;

  useEffect(() => {
    if (props.open) {
      setActiveTab(props.initialTab ?? 'direct');
    } else {
      reset();
      setSubmitting(false);
    }
  }, [props.open, props.initialTab, reset]);

  async function handleDirectPick(user: DirectoryUser) {
    setSubmitting(true);
    try {
      const room = await api.createDirectRoom(user.id);
      props.onOpenRoom(room);
      props.onClose();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGroup({ name, memberIds }: GroupFormValues) {
    setSubmitting(true);
    try {
      const room = await api.createGroupRoom(name.trim(), memberIds);
      props.onOpenRoom(room);
      props.onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không tạo được nhóm.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={props.open}
      onCancel={props.onClose}
      title="Cuộc trò chuyện mới"
      footer={null}
      destroyOnHidden
      width={480}
      className="new-chat-modal"
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'direct' | 'group')}
        items={[
          {
            key: 'direct',
            label: 'Nhắn riêng',
            children: (
              <div className="new-chat-direct">
                <UserPicker mode="single" onPick={handleDirectPick} />
              </div>
            ),
          },
          {
            key: 'group',
            label: 'Tạo nhóm',
            children: (
              <div className="new-chat-group">
                <div className="new-group-name-row">
                  <Controller
                    control={control}
                    name="name"
                    rules={{ validate: (value) => Boolean(value.trim()) }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Nhập tên nhóm (tối đa 80 ký tự)..."
                        maxLength={80}
                        allowClear
                      />
                    )}
                  />
                </div>
                <div className="new-group-label">Chọn thành viên:</div>
                <Controller
                  control={control}
                  name="memberIds"
                  rules={{ validate: (ids) => ids.length > 0 }}
                  render={({ field }) => (
                    <UserPicker mode="multi" selected={field.value} onChange={field.onChange} />
                  )}
                />
                <div className="new-group-footer">
                  <Button onClick={props.onClose}>Hủy</Button>
                  <Button
                    type="primary"
                    disabled={!isValid}
                    loading={submitting}
                    onClick={() => void handleSubmit(handleCreateGroup)()}
                  >
                    Tạo nhóm ({memberCount})
                  </Button>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
