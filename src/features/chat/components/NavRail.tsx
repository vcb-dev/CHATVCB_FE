import {
  FileTextOutlined,
  LogoutOutlined,
  MailOutlined,
  MessageOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Avatar } from 'antd';
import { fileSrc } from '@/api/client';
import { avatarColor, initials } from '@/lib/avatar';
import type { User } from '@/types';
import type { Workspace } from '../hooks/useWorkspace';

const WORKSPACES: { id: Workspace; label: string; icon: typeof MessageOutlined }[] = [
  { id: 'messenger', label: 'Messenger', icon: MessageOutlined },
  { id: 'email', label: 'Email', icon: MailOutlined },
  { id: 'docs', label: 'Docs', icon: FileTextOutlined },
  { id: 'meetings', label: 'Cuộc họp', icon: VideoCameraOutlined },
];

export function NavRail(props: {
  workspace: Workspace;
  user: User;
  onSelect: (workspace: Workspace) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const { user } = props;
  return (
    <nav className="nav-rail">
      <div className="nav-rail-brand">C</div>
      <div className="nav-rail-items">
        {WORKSPACES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={props.workspace === item.id ? 'nav-rail-btn active' : 'nav-rail-btn'}
              onClick={() => props.onSelect(item.id)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="nav-rail-foot">
        <button
          type="button"
          className="nav-rail-avatar"
          title={user.name}
          onClick={props.onOpenProfile}
        >
          <Avatar
            size={36}
            src={user.avatarUrl ? fileSrc(user.avatarUrl) : undefined}
            style={{ background: avatarColor(user.name), color: '#fff', fontWeight: 700 }}
          >
            {initials(user.name)}
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
