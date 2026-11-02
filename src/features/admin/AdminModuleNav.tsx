import { P, can } from '@/lib/access';
import type { User } from '@/types';

type AdminSection = 'roles' | 'users';

interface AdminModuleNavProps {
  user: User;
  active: AdminSection;
  onChange: (tab: AdminSection) => void;
}

export function AdminModuleNav({ user, active, onChange }: AdminModuleNavProps) {
  return (
    <nav className="dept-module-nav" aria-label="Phân quyền">
      {can(user, P.roles.read) ? (
        <button
          type="button"
          className={`dept-module-nav-btn${active === 'roles' ? ' active' : ''}`}
          onClick={() => onChange('roles')}
        >
          Role
        </button>
      ) : null}
      {can(user, P.users.read) ? (
        <button
          type="button"
          className={`dept-module-nav-btn${active === 'users' ? ' active' : ''}`}
          onClick={() => onChange('users')}
        >
          Tài khoản
        </button>
      ) : null}
    </nav>
  );
}
