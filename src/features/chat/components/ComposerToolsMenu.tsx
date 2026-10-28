import {
  BarChartOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  IdcardOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import type { ToolKind } from '@/types';

export function ComposerToolsMenu(props: {
  isGroup: boolean;
  locked: boolean;
  disabled: boolean;
  onPick: (kind: ToolKind) => void;
  onLocation: () => void;
  onCard: () => void;
}) {
  const items: MenuProps['items'] = [];
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
          if (key === 'location') {
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
          shape="circle"
          icon={<PlusCircleOutlined />}
          className="composer-icon"
          disabled={props.disabled}
        />
      </Tooltip>
    </Dropdown>
  );
}
