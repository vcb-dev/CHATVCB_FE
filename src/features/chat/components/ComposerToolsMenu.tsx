import { BarChartOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import type { ToolKind } from '@/types';

export function ComposerToolsMenu(props: {
  isGroup: boolean;
  locked: boolean;
  disabled: boolean;
  onPick: (kind: ToolKind) => void;
}) {
  const items: MenuProps['items'] = [];
  if (props.isGroup && !props.locked) {
    items.push({
      key: 'poll',
      icon: <BarChartOutlined />,
      label: 'Tạo bình chọn',
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => props.onPick(key as ToolKind),
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
