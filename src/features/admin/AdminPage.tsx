import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { useState } from 'react';
import { SafetyOutlined, UserOutlined } from '@ant-design/icons';
import { ModuleSidebar } from '@/components/ModuleSidebar';
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

  const items = [];
  if (canReadRoles) {
    items.push({
      key: 'roles',
      label: 'Role',
      icon: <SafetyOutlined />,
    });
  }
  if (canReadUsers) {
    items.push({
      key: 'users',
      label: 'Tài khoản',
      icon: <UserOutlined />,
    });
  }

  const sidebar = (
    <ModuleSidebar
      title="Phân quyền"
      activeKey={section}
      onSelect={(key) => setSection(key as 'roles' | 'users')}
      groups={[{ items }]}
    />
  );

  return (
    <>
      {section === 'roles' && canReadRoles ? (
        <RolesView user={user} sidebar={sidebar} />
      ) : null}
      {section === 'users' && canReadUsers ? (
        <UsersView user={user} sidebar={sidebar} />
      ) : null}
    </>
  );
}
