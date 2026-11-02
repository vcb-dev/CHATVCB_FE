import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Table, Tag, message } from 'antd';
import { useState } from 'react';
import { UserEditModal } from './components/UserEditModal';
import { UserFormModal } from './components/UserFormModal';
import { useAdminMutations } from './hooks/useAdminMutations';
import { useAdminUsersQuery, useCatalogQuery, useRolesQuery } from './hooks/useAdminQueries';
import type { AdminUser } from './types';
import {
  allPermissionKeys,
  overridesFromEffective,
  permissionsFromRoles,
} from './userPermissionPersonalization';

interface UsersViewProps {
  user: User;
}

export function UsersView({ user }: UsersViewProps) {
  const { data: users = [], isPending } = useAdminUsersQuery();
  const { data: roles = [] } = useRolesQuery();
  const { data: groups = [] } = useCatalogQuery();
  const mutations = useAdminMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const canAssignRole = can(user, P.users.assignRole);
  const editLoading =
    mutations.updateUser.isPending ||
    mutations.setUserRoles.isPending ||
    mutations.setUserPermissions.isPending;

  function showTempPassword(password: string) {
    Modal.info({
      title: 'Mật khẩu tạm — chỉ hiện 1 lần',
      content: password,
    });
  }

  return (
    <main className="dept-page">
      <div className="dept-hero">
        <section className="dept-hero-main">
          <h1>Tài khoản</h1>
          <p>Tạo tài khoản, gán role và cá nhân hoá quyền trong màn Sửa.</p>
        </section>
      </div>
      {can(user, P.users.create) ? (
        <div className="dept-toolbar">
          <div className="dept-toolbar-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tài khoản
            </Button>
          </div>
        </div>
      ) : null}
      <Table
        rowKey="id"
        loading={isPending}
        dataSource={users}
        pagination={false}
        columns={[
          {
            title: 'Tên',
            dataIndex: 'name',
            render: (_, row) => (
              <>
                <strong>{row.name}</strong>
                {row.isActive ? null : (
                  <Tag color="default" style={{ marginInlineStart: 8 }}>
                    Khóa
                  </Tag>
                )}
              </>
            ),
          },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Team', dataIndex: 'team', width: 100 },
          {
            title: 'Role',
            render: (_, row) =>
              row.roles.length
                ? row.roles.map((role) => <Tag key={role.id}>{role.name}</Tag>)
                : '—',
          },
          {
            title: '',
            width: 220,
            render: (_, row) => (
              <div className="admin-row-actions">
                {can(user, P.users.update) ? (
                  <Button type="link" size="small" onClick={() => setEditing(row)}>
                    Sửa
                  </Button>
                ) : null}
                {can(user, P.users.resetPassword) ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      Modal.confirm({
                        title: `Reset mật khẩu ${row.name}?`,
                        onOk: async () => {
                          const result = await mutations.resetPassword.mutateAsync(row.id);
                          showTempPassword(result.temporaryPassword);
                        },
                      })
                    }
                  >
                    Reset MK
                  </Button>
                ) : null}
                {can(user, P.users.deactivate) && row.id !== user.id && row.isActive ? (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() =>
                      Modal.confirm({
                        title: `Khóa ${row.name}?`,
                        okType: 'danger',
                        onOk: () => mutations.deactivateUser.mutateAsync(row.id),
                      })
                    }
                  >
                    Khóa
                  </Button>
                ) : null}
                {can(user, P.users.update) && !row.isActive ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      mutations.updateUser.mutateAsync({ id: row.id, isActive: true })
                    }
                  >
                    Mở khóa
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <UserFormModal
        open={createOpen}
        roles={roles}
        confirmLoading={mutations.createUser.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          const created = await mutations.createUser.mutateAsync(values);
          setCreateOpen(false);
          message.success('Đã tạo tài khoản.');
          if (created.temporaryPassword) {
            showTempPassword(created.temporaryPassword);
          }
        }}
      />

      <UserEditModal
        open={Boolean(editing)}
        user={editing}
        roles={roles}
        groups={groups}
        canAssignRole={canAssignRole}
        confirmLoading={editLoading}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return;
          await mutations.updateUser.mutateAsync({
            id: editing.id,
            name: values.name,
            team: values.team,
          });
          if (canAssignRole) {
            await mutations.setUserRoles.mutateAsync({
              id: editing.id,
              roleIds: values.roleIds,
            });
            const rolePerms = permissionsFromRoles(
              values.roleIds,
              roles,
              groups,
            );
            const items = overridesFromEffective(
              rolePerms,
              values.effectivePermissions,
              allPermissionKeys(groups),
            );
            await mutations.setUserPermissions.mutateAsync({
              id: editing.id,
              items,
            });
          }
          message.success('Đã lưu tài khoản.');
          setEditing(null);
        }}
      />
    </main>
  );
}
