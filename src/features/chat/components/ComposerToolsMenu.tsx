import {
  AppstoreOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  IdcardOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import type { ToolKind } from '@/types';

export function ComposerToolsMenu(props: {
  isGroup: boolean;
  canAssign: boolean;
  locked: boolean;
  disabled: boolean;
  onOpenGallery: () => void;
  onPick: (kind: ToolKind) => void;
  onLocation: () => void;
  onCard: () => void;
  /** Khổ điện thoại: nút Ảnh và Tệp gộp vào menu này để ô nhập không bị bóp hẹp */
  onPickImages?: () => void;
  onPickFiles?: () => void;
}) {
  const items: MenuProps['items'] = [];
  if (props.onPickImages) {
    items.push({ key: 'images', icon: <PictureOutlined />, label: 'Ảnh' });
  }
  if (props.onPickFiles) {
    items.push({ key: 'files', icon: <PaperClipOutlined />, label: 'Tệp đính kèm' });
  }
  items.push(
    {
      key: 'gallery',
      icon: <AppstoreOutlined />,
      label: 'Bộ sưu tập ảnh',
    },
  );
  if (props.canAssign) {
    items.push({
      key: 'task',
      icon: <CheckSquareOutlined />,
      label: 'Giao việc',
    });
  }
  if (props.isGroup && !props.locked) {
    items.push({
      key: 'poll',
      icon: <BarChartOutlined />,
      label: 'Tạo bình chọn',
    });
  }

  items.push(
    {
      key: 'reminder',
      icon: <ClockCircleOutlined />,
      label: 'Tạo nhắc hẹn',
    },
    {
      key: 'note',
      icon: <FileTextOutlined />,
      label: 'Tạo ghi chú',
    },
    {
      key: 'location',
      icon: <EnvironmentOutlined />,
      label: 'Gửi vị trí',
    },
    {
      key: 'card',
      icon: <IdcardOutlined />,
      label: 'Gửi danh thiếp',
    },
  );

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === 'images') {
            props.onPickImages?.();
          } else if (key === 'files') {
            props.onPickFiles?.();
          } else if (key === 'gallery') {
            props.onOpenGallery();
          } else if (key === 'location') {
            props.onLocation();
          } else if (key === 'card') {
            props.onCard();
          } else {
            props.onPick(key as ToolKind);
          }
        },
      }}
      trigger={['click']}
      placement="topLeft"
    >
      <Tooltip title="Công cụ">
        <Button
          type="text"
          icon={<PlusOutlined />}
          className="composer-plus-btn"
          aria-label="Công cụ"
          disabled={props.disabled}
        />
      </Tooltip>
    </Dropdown>
  );
}
