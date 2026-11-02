import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { useState } from 'react';
import { AdminModuleNav } from './AdminModuleNav';
import { RolesView } from './RolesView';
import { UsersView } from './UsersView';

interface AdminPageProps {
  user: User;
}

export function AdminPage({ user }: AdminPageProps) {
  const [section, setSection] = useState<'roles' | 'users'>(
    can(user, P.roles.read) ? 'roles' : 'users',
  );

  return (
    <div className="dept-module-shell">
      <AdminModuleNav user={user} active={section} onChange={setSection} />
      {section === 'roles' && can(user, P.roles.read) ? <RolesView user={user} /> : null}
      {section === 'users' && can(user, P.users.read) ? <UsersView user={user} /> : null}
    </div>
  );
}
