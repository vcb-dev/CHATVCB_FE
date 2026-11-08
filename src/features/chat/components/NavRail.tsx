import { useState } from 'react';
import { Avatar, Dropdown, type MenuProps, Switch, Tooltip } from 'antd';
import {
  ApartmentOutlined,
  CheckSquareOutlined,
  ContactsOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MailOutlined,
  MessageOutlined,
  NotificationOutlined,
  PictureOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import { notifyEnabled, requestNotifyPermission, setNotifyEnabled } from '@/lib/notify';
import { visibleWorkspaces } from '@/lib/workspaces';
import type { User } from '@/types';
import type { Workspace } from '../hooks/useWorkspace';

const WORKSPACE_ICONS: Record<Workspace, typeof MessageOutlined> = {
  messenger: MessageOutlined,
  tasks: CheckSquareOutlined,
  contacts: ContactsOutlined,
  email: MailOutlined,
  docs: FileTextOutlined,
  meetings: VideoCameraOutlined,
  gallery: PictureOutlined,
  news: NotificationOutlined,
  hr: TeamOutlined,
  departments: ApartmentOutlined,
  admin: SafetyOutlined,
};

const MAIN_WORKSPACES: Workspace[] = [
  'messenger',
  'tasks',
  'contacts',
  'email',
  'docs',
  'meetings',
  'news',
];

const ADMIN_WORKSPACES: Workspace[] = ['gallery', 'hr', 'departments', 'admin'];

export function NavRail(props: {
  workspace: Workspace;
  user: User;
  badges?: Partial<Record<Workspace, number>>;
  onSelect: (workspace: Workspace) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const [notifyOn, setNotifyOn] = useState(notifyEnabled);
  const items = visibleWorkspaces(props.user);
  const mainItems = items.filter((item) => MAIN_WORKSPACES.includes(item.id));
  const adminItems = items.filter((item) => ADMIN_WORKSPACES.includes(item.id));

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
      onClick: props.onOpenProfile,
    },
    {
      key: 'notify',
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span>Thông báo tin nhắn</span>
          <Switch
            size="small"
            checked={notifyOn}
            onChange={(checked) => {
              setNotifyEnabled(checked);
              setNotifyOn(checked);
              if (checked) {
                void requestNotifyPermission();
              }
            }}
          />
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      className: 'nav-rail-logout',
      onClick: props.onLogout,
    },
  ];

  const renderItem = (item: (typeof items)[0]) => {
    const Icon = WORKSPACE_ICONS[item.id];
    const badge = props.badges?.[item.id] ?? 0;
    const active = props.workspace === item.id;
    return (
      <Tooltip
        key={item.id}
        title={item.label}
        placement="right"
        mouseEnterDelay={0.3}
      >
        <button
          type="button"
          className={`nav-rail-btn${active ? ' active' : ''}`}
          aria-label={item.label}
          onClick={() => props.onSelect(item.id)}
        >
          <Icon />
          <span className="ui-visually-hidden">{item.label}</span>
          {badge > 0 ? (
            <b className="nav-rail-badge">{badge > 99 ? '99+' : badge}</b>
          ) : null}
        </button>
      </Tooltip>
    );
  };

  return (
    <nav className="nav-rail">
      <button
        type="button"
        className="nav-rail-avatar"
        title={props.user.name}
        aria-label="Hồ sơ cá nhân"
        onClick={props.onOpenProfile}
      >
        <Avatar
          size={40}
          src={props.user.avatarUrl ? fileSrc(props.user.avatarUrl) : undefined}
          style={{
            background: avatarColor(props.user.name),
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {initials(props.user.name)}
        </Avatar>
      </button>

      <div className="nav-rail-items ui-scroll">
        {mainItems.map(renderItem)}
        {adminItems.length > 0 && <div className="nav-rail-sep" />}
        {adminItems.map(renderItem)}
      </div>

      <div className="nav-rail-foot">
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="topLeft"
          onOpenChange={(open) => {
            if (open) {
              setNotifyOn(notifyEnabled());
            }
          }}
        >
          <Tooltip title="Cài đặt" placement="right" mouseEnterDelay={0.3}>
            <button
              type="button"
              className="nav-rail-btn settings"
              aria-label="Cài đặt"
            >
              <SettingOutlined />
              <span className="ui-visually-hidden">Cài đặt</span>
            </button>
          </Tooltip>
        </Dropdown>
      </div>
    </nav>
  );
}
