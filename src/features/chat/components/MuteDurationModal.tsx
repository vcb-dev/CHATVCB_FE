import { useState } from 'react';
import { Modal, Radio, Space } from 'antd';
import { MUTE_OPTIONS } from '../utils/rooms';

export function MuteDurationModal({
  open,
  onPick,
  onCancel,
}: {
  open: boolean;
  onPick: (minutes: number | null) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(60);

  return (
    <Modal
      title="Tắt thông báo trong"
      open={open}
      okText="Tắt thông báo"
      cancelText="Hủy"
      onOk={() => onPick(selected)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Radio.Group
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ marginTop: 12, marginBottom: 12 }}
      >
        <Space direction="vertical">
          {MUTE_OPTIONS.map((opt) => (
            <Radio key={opt.label} value={opt.minutes}>
              {opt.label}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  );
}
