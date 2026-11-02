import { P, can } from "@/lib/access";
import type { User } from "@/types";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Table, Tag } from "antd";
import { useState } from "react";
import { RoleFormModal } from "./components/RoleFormModal";
import { confirmDeleteRole } from "./roleDeleteConfirm";
import { useAdminMutations } from "./hooks/useAdminMutations";
import { useCatalogQuery, useRolesQuery } from "./hooks/useAdminQueries";
import type { AdminRole } from "./types";

interface RolesViewProps {
  user: User;
}

export function RolesView({ user }: RolesViewProps) {
  const { data: roles = [], isPending } = useRolesQuery();
  const { data: groups = [] } = useCatalogQuery();
  const mutations = useAdminMutations();
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; role: AdminRole } | null
  >(null);

  const canDeleteRole = can(user, P.roles.delete);

  async function deleteRole(row: AdminRole) {
    await mutations.deleteRole.mutateAsync(row.id);
    setModal(null);
  }

  return (
    <main className="dept-page">
      <div className="dept-hero">
        <section className="dept-hero-main">
          <h1>Role</h1>
          <p>Tạo role, tick quyền mặc định, gán sau vào tài khoản.</p>
        </section>
      </div>
      {can(user, P.roles.create) ? (
        <div className="dept-toolbar">
          <div className="dept-toolbar-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModal({ mode: "create" })}
            >
              Role
            </Button>
          </div>
        </div>
      ) : null}
      <Table
        rowKey="id"
        loading={isPending}
        dataSource={roles}
        pagination={false}
        columns={[
          {
            title: "Tên",
            dataIndex: "name",
            render: (_, row) => (
              <>
                <strong>{row.name}</strong> <Tag>{row.key}</Tag>
                {row.isSystem ? <Tag color="blue">Hệ thống</Tag> : null}
              </>
            ),
          },
          { title: "Người", dataIndex: "userCount", width: 90 },
          {
            title: "Quyền",
            dataIndex: "permissions",
            render: (v: string[]) => v.length,
          },
          {
            title: "Thao tác",
            width: 140,
            render: (_, row) => (
              <div className="admin-row-actions">
                {can(user, P.roles.update) ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setModal({ mode: "edit", role: row })}
                  >
                    Sửa
                  </Button>
                ) : null}
                {canDeleteRole && !row.isSystem ? (
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      confirmDeleteRole(row, () => deleteRole(row))
                    }
                  >
                    Xóa
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      <RoleFormModal
        open={modal !== null}
        mode={modal?.mode === "edit" ? "edit" : "create"}
        role={modal?.mode === "edit" ? modal.role : null}
        roles={roles}
        groups={groups}
        confirmLoading={
          mutations.createRole.isPending ||
          mutations.updateRole.isPending ||
          mutations.setRolePermissions.isPending
        }
        deleteLoading={mutations.deleteRole.isPending}
        canDelete={canDeleteRole}
        onDelete={
          modal?.mode === "edit"
            ? async () => {
                const row = modal.role;
                confirmDeleteRole(row, () => deleteRole(row));
              }
            : undefined
        }
        onClose={() => setModal(null)}
        onSubmit={async (values) => {
          if (modal?.mode === "create") {
            await mutations.createRole.mutateAsync(values);
          } else if (modal?.mode === "edit") {
            await mutations.updateRole.mutateAsync({
              id: modal.role.id,
              name: values.name,
              description: values.description,
            });
            if (modal.role.key !== "admin") {
              await mutations.setRolePermissions.mutateAsync({
                id: modal.role.id,
                permissions: values.permissions,
              });
            }
          }
          setModal(null);
        }}
      />
    </main>
  );
}
