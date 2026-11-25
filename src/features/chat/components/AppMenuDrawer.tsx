import { useEffect, useState, type ReactNode } from 'react';
import { Drawer, message, Modal, Segmented, Switch } from 'antd';
import {
  ApartmentOutlined,
  BellOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  ContactsOutlined,
  DesktopOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MailOutlined,
  MessageOutlined,
  MoonOutlined,
  NotificationOutlined,
  PictureOutlined,
  SafetyOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { UserAvatar } from '@/components/UserAvatar';
import { notifyGranted, toggleNotify } from '@/lib/notify';
import { installApp, needsIosInstallHint, usePwa } from '@/lib/pwa';
import { visibleWorkspaces } from '@/lib/workspaces';
import { useThemeMode, type ThemeMode } from '@/theme/themeMode';
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

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Sáng', icon: <SunOutlined /> },
  { value: 'dark', label: 'Tối', icon: <MoonOutlined /> },
  { value: 'system', label: 'Theo hệ thống', icon: <DesktopOutlined /> },
];

export function AppMenuDrawer(props: {
  open: boolean;
  hoverMode: boolean;
  onClose: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  workspace: Workspace;
  user: User;
  badges?: Partial<Record<Workspace, number>>;
  onSelect: (workspace: Workspace) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const [notifyOn, setNotifyOn] = useState(notifyGranted);
  const themeMode = useThemeMode();
  const { canInstall } = usePwa();
  const iosInstall = needsIosInstallHint();
  const items = visibleWorkspaces(props.user);
  const mainItems = items.filter((item) => MAIN_WORKSPACES.includes(item.id));
  const adminItems = items.filter((item) => ADMIN_WORKSPACES.includes(item.id));
  const profileSub = props.user.team
    ? `Team ${props.user.team}`
    : (props.user.email ?? '');

  useEffect(() => {
    if (props.open) {
      setNotifyOn(notifyGranted());
    }
  }, [props.open]);

  const handleToggleNotify = (checked: boolean) => {
    setNotifyOn(checked);
    void toggleNotify(checked).then((on) => {
      setNotifyOn(on);
      if (checked && !on) {
        void message.warning('Trình duyệt đang chặn thông báo. Hãy cho phép thông báo trong cài đặt trang / hệ thống.');
      }
    });
  };

  const handleInstall = () => {
    props.onClose();
    if (canInstall) {
      void installApp();
      return;
    }
    Modal.info({
      title: 'Cài CHATVCB lên iPhone/iPad',
      content: (
        <ol className="install-steps">
          <li>Mở trang này bằng Safari.</li>
          <li>
            Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).
          </li>
          <li>
            Chọn <b>Thêm vào MH chính</b> rồi bấm <b>Thêm</b>.
          </li>
          <li>Mở CHATVCB từ icon mới và bật thông báo trong menu.</li>
        </ol>
      ),
      okText: 'Đã hiểu',
    });
  };

  const handleOpenProfile = () => {
    props.onOpenProfile();
    props.onClose();
  };

  const renderItem = (item: (typeof items)[0]) => {
    const Icon = WORKSPACE_ICONS[item.id];
    const badge = props.badges?.[item.id] ?? 0;
    const active = props.workspace === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`app-menu-item${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => {
          props.onSelect(item.id);
          props.onClose();
        }}
      >
        <span className="app-menu-item-icon">
          <Icon />
        </span>
        <span className="app-menu-item-label">{item.label}</span>
        {badge > 0 ? (
          <b className="app-menu-badge">{badge > 99 ? '99+' : badge}</b>
        ) : null}
      </button>
    );
  };

  return (
    <Drawer
      placement="left"
      size={300}
      closable={false}
      destroyOnHidden
      mask={!props.hoverMode}
      rootClassName="app-menu-drawer"
      open={props.open}
      onClose={props.onClose}
      onMouseEnter={props.onHoverEnter}
      onMouseLeave={props.onHoverLeave}
    >
      <div className="app-menu-shell">
        <div className="app-menu-profile">
          <button
            type="button"
            className="app-menu-profile-btn"
            aria-label="Hồ sơ cá nhân"
            onClick={handleOpenProfile}
          >
            <UserAvatar
              size={48}
              src={props.user.avatarUrl}
              name={props.user.name}
              zoomable={false}
              style={{ fontWeight: 700 }}
            />
            <span className="app-menu-user-meta">
              <strong className="app-menu-user-name">{props.user.name}</strong>
              {profileSub ? (
                <small className="app-menu-user-sub">{profileSub}</small>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className="app-menu-close"
            aria-label="Đóng menu"
            onClick={props.onClose}
          >
            <CloseOutlined />
          </button>
        </div>

        <nav className="app-menu-list ui-scroll" aria-label="Điều hướng màn hình">
          {mainItems.map(renderItem)}
          {adminItems.length > 0 && <div className="app-menu-sep" />}
          {adminItems.map(renderItem)}
        </nav>

        <div className="app-menu-foot">
          <button
            type="button"
            className="app-menu-foot-item"
            onClick={handleOpenProfile}
          >
            <span className="app-menu-item-icon">
              <UserOutlined />
            </span>
            <span className="app-menu-item-label">Hồ sơ</span>
          </button>

          {canInstall || iosInstall ? (
            <button type="button" className="app-menu-foot-item" onClick={handleInstall}>
              <span className="app-menu-item-icon">
                <DownloadOutlined />
              </span>
              <span className="app-menu-item-label">Cài đặt ứng dụng</span>
            </button>
          ) : null}

          <div className="app-menu-foot-item notify">
            <span className="app-menu-item-icon">
              <BellOutlined />
            </span>
            <span className="app-menu-item-label">Thông báo tin nhắn</span>
            <Switch
              size="small"
              aria-label="Thông báo tin nhắn"
              checked={notifyOn}
              onChange={handleToggleNotify}
            />
          </div>

          <div className="app-menu-foot-item theme">
            <span className="app-menu-item-icon">
              {themeMode.resolved === 'dark' ? <MoonOutlined /> : <SunOutlined />}
            </span>
            <span className="app-menu-item-label">Giao diện</span>
            <Segmented<ThemeMode>
              size="small"
              aria-label="Giao diện sáng hoặc tối"
              value={themeMode.mode}
              onChange={themeMode.setMode}
              options={THEME_OPTIONS.map((opt) => ({
                value: opt.value,
                icon: opt.icon,
                title: opt.label,
              }))}
            />
          </div>

          <div className="app-menu-sep" />

          <button
            type="button"
            className="app-menu-foot-item logout"
            onClick={() => {
              props.onClose();
              props.onLogout();
            }}
          >
            <span className="app-menu-item-icon">
              <LogoutOutlined />
            </span>
            <span className="app-menu-item-label">Đăng xuất</span>
          </button>
        </div>
      </div>
    </Drawer>
  );
}
