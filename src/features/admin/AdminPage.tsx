import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { useState } from 'react';
import type { PageTabs } from '@/components/PageHeader';
import { RolesView } from './RolesView';
import { UsersView } from './UsersView';

interface AdminPageProps {
  user: User;
}

export function AdminPage({ user }: AdminPageProps) {
  const canReadRoles = can(user, P.roles.read);
  const canReadUsers = can(user, P.users.read);

  const [section, setSection] = useState<'roles' | 'users'>(
    canReadRoles ? 'roles' : 'users',
  );

  const tabs: PageTabs = {
    items: [
      ...(canReadRoles ? [{ key: 'roles', label: 'Role' }] : []),
      ...(canReadUsers ? [{ key: 'users', label: 'Tài khoản' }] : []),
    ],
    activeKey: section,
    onChange: (key) => setSection(key as 'roles' | 'users'),
  };

  return (
    <>
      {section === 'roles' && canReadRoles ? (
        <RolesView user={user} tabs={tabs} />
      ) : null}
      {section === 'users' && canReadUsers ? (
        <UsersView user={user} tabs={tabs} />
      ) : null}
    </>
  );
}
