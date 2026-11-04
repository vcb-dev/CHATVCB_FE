import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import { visibleWorkspaces } from '@/lib/workspaces';
import type { User } from '@/types';
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
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar } from 'antd';
import type { Workspace } from '../hooks/useWorkspace';

const WORKSPACE_ICONS: Record<
  Workspace,
  typeof MessageOutlined
> = {
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

export function NavRail(props: {
  workspace: Workspace;
  user: User;
  badges?: Partial<Record<Workspace, number>>;
  onSelect: (workspace: Workspace) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const items = visibleWorkspaces(props.user);
  return (
    <nav className="nav-rail">
      <div className="nav-rail-brand">C</div>
      <div className="nav-rail-items">
        {items.map((item) => {
          const Icon = WORKSPACE_ICONS[item.id];
          const badge = props.badges?.[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              className={
                props.workspace === item.id ? 'nav-rail-btn active' : 'nav-rail-btn'
              }
              onClick={() => props.onSelect(item.id)}
            >
              <Icon />
              <span>{item.label}</span>
              {badge > 0 ? <b className="nav-rail-badge">{badge > 99 ? '99+' : badge}</b> : null}
            </button>
          );
        })}
      </div>
      <div className="nav-rail-foot">
        <button
          type="button"
          className="nav-rail-avatar"
          title={props.user.name}
          onClick={props.onOpenProfile}
        >
          <Avatar
            size={36}
            src={props.user.avatarUrl ? fileSrc(props.user.avatarUrl) : undefined}
            style={{ background: avatarColor(props.user.name), color: '#fff', fontWeight: 700 }}
          >
            {initials(props.user.name)}
          </Avatar>
        </button>
        <button type="button" className="nav-rail-btn logout" title="Thoát" onClick={props.onLogout}>
          <LogoutOutlined />
          <span>Thoát</span>
        </button>
      </div>
    </nav>
  );
}
