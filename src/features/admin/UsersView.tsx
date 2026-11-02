import { P, can } from '@/lib/access';
import type { User } from '@/types';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { useState } from 'react';
import { UserAccessDrawer } from './components/UserAccessDrawer';
import { UserFormModal } from './components/UserFormModal';
import { useAdminMutations } from './hooks/useAdminMutations';
import { useAdminUsersQuery, useCatalogQuery, useRolesQuery } from './hooks/useAdminQueries';
import type { AdminUser } from './types';

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
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [accessTarget, setAccessTarget] = useState<AdminUser | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [editForm] = Form.useForm<{ name: string; team: string }>();

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
          <p>Tạo, khóa, gán role và chỉnh quyền riêng từng người.</p>
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
            width: 280,
            render: (_, row) => (
              <div className="admin-row-actions">
                {can(user, P.users.update) ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setEditing(row);
                      editForm.setFieldsValue({ name: row.name, team: row.team });
                    }}
                  >
                    Sửa
                  </Button>
                ) : null}
                {can(user, P.users.assignRole) ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setRoleTarget(row);
                      setRoleIds(row.roles.map((role) => role.id));
                    }}
                  >
                    Role
                  </Button>
                ) : null}
                {can(user, P.users.assignRole) ? (
                  <Button type="link" size="small" onClick={() => setAccessTarget(row)}>
                    Quyền
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

      <Modal
        title={editing ? `Sửa ${editing.name}` : 'Sửa'}
        open={Boolean(editing)}
        confirmLoading={mutations.updateUser.isPending}
        onCancel={() => setEditing(null)}
        onOk={() => {
          if (!editing) return;
          void editForm.validateFields().then(async (values) => {
            await mutations.updateUser.mutateAsync({ id: editing.id, ...values });
            setEditing(null);
          });
        }}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="team" label="Team">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={roleTarget ? `Role: ${roleTarget.name}` : 'Role'}
        open={Boolean(roleTarget)}
        confirmLoading={mutations.setUserRoles.isPending}
        onCancel={() => setRoleTarget(null)}
        onOk={() => {
          if (!roleTarget) return;
          void mutations.setUserRoles
            .mutateAsync({ id: roleTarget.id, roleIds })
            .then(() => setRoleTarget(null));
        }}
        destroyOnHidden
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          value={roleIds}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          onChange={setRoleIds}
        />
      </Modal>

      <UserAccessDrawer
        user={accessTarget}
        groups={groups}
        confirmLoading={mutations.setUserPermissions.isPending}
        onClose={() => setAccessTarget(null)}
        onSave={async (items) => {
          if (!accessTarget) return;
          await mutations.setUserPermissions.mutateAsync({
            id: accessTarget.id,
            items,
          });
        }}
      />
    </main>
  );
}
