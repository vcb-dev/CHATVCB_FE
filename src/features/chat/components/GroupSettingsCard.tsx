import { SettingOutlined } from '@ant-design/icons';
import { Switch, message } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import type { GroupSettings, Room } from '@/types';
import { errorText } from '@/lib/errors';

interface GroupSettingsCardProps {
  room: Room;
  onRoomUpdated: (room: Room) => void;
}

const SETTING_ITEMS: { key: keyof GroupSettings; label: string }[] = [
  { key: 'adminOnlySend', label: 'Chỉ trưởng/phó nhóm được gửi tin' },
  { key: 'adminOnlyPin', label: 'Chỉ trưởng/phó nhóm được ghim tin' },
  { key: 'adminOnlyInfo', label: 'Chỉ trưởng/phó nhóm được đổi tên, ảnh nhóm' },
  { key: 'joinApproval', label: 'Duyệt thành viên mới' },
];

export function GroupSettingsCard({ room, onRoomUpdated }: GroupSettingsCardProps) {
  const [loadingKey, setLoadingKey] = useState<keyof GroupSettings | null>(null);

  if (!room.canManage) {
    return null;
  }

  const currentSettings: GroupSettings = {
    adminOnlySend: room.settings?.adminOnlySend ?? false,
    adminOnlyPin: room.settings?.adminOnlyPin ?? false,
    adminOnlyInfo: room.settings?.adminOnlyInfo ?? false,
    joinApproval: room.settings?.joinApproval ?? false,
  };

  const handleToggle = async (key: keyof GroupSettings, on: boolean) => {
    const prevRoom = room;
    const nextRoom: Room = {
      ...room,
      settings: {
        ...currentSettings,
        [key]: on,
      },
    };
    onRoomUpdated(nextRoom);
    setLoadingKey(key);

    try {
      const updated = await api.updatePermissions(room.id, { [key]: on });
      onRoomUpdated({
        ...nextRoom,
        ...updated,
        settings: updated.settings ?? nextRoom.settings,
      });
    } catch (err) {
      onRoomUpdated(prevRoom);
      message.error(errorText(err, 'Không cập nhật được quyền nhóm.'));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="group-card">
      <div className="group-settings-header">
        <span className="group-ico">
          <SettingOutlined />
        </span>
        <span className="group-row-text">
          <strong>Quyền trong nhóm</strong>
        </span>
      </div>
      <div className="group-settings-list">
        {SETTING_ITEMS.map((item) => (
          <div key={item.key} className="group-row static">
            <span className="group-row-text">
              <span>{item.label}</span>
            </span>
            <Switch
              size="small"
              checked={currentSettings[item.key]}
              loading={loadingKey === item.key}
              onChange={(checked) => handleToggle(item.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
