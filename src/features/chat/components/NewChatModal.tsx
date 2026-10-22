import { useEffect, useState } from 'react';
import { Button, Input, Modal, Tabs, message } from 'antd';
import { api } from '@/api/client';
import { UserPicker } from './UserPicker';
import type { DirectoryUser, Room } from '@/types';

export function NewChatModal(props: {
  open: boolean;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
}) {
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!props.open) {
      setGroupName('');
      setSelectedIds([]);
      setSubmitting(false);
      setActiveTab('direct');
    }
  }, [props.open]);

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

  async function handleCreateGroup() {
    const trimmed = groupName.trim();
    if (!trimmed || selectedIds.length === 0) {
      return;
    }
    setSubmitting(true);
    try {
      const room = await api.createGroupRoom(trimmed, selectedIds);
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
                  <Input
                    placeholder="Nhập tên nhóm (tối đa 80 ký tự)..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={80}
                    allowClear
                  />
                </div>
                <div className="new-group-label">Chọn thành viên:</div>
                <UserPicker
                  mode="multi"
                  selected={selectedIds}
                  onChange={setSelectedIds}
                />
                <div className="new-group-footer">
                  <Button onClick={props.onClose}>Hủy</Button>
                  <Button
                    type="primary"
                    disabled={!groupName.trim() || selectedIds.length === 0}
                    loading={submitting}
                    onClick={() => void handleCreateGroup()}
                  >
                    Tạo nhóm ({selectedIds.length})
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
