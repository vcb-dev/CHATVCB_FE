import { useQuery } from "@tanstack/react-query";
import { Form, Input, Modal, Select, Spin } from "antd";
import { useEffect, useState } from "react";
import { adminKeys } from "../queries/adminKeys";
import { fetchUserAccess } from "../services/adminApi";
import type { AdminRole, AdminUser, PermissionGroup } from "../types";
import { permissionsFromRoles } from "../userPermissionPersonalization";
import { PermissionMatrix } from "./PermissionMatrix";

interface UserEditModalProps {
  open: boolean;
  user: AdminUser | null;
  roles: AdminRole[];
  groups: PermissionGroup[];
  canAssignRole: boolean;
  confirmLoading: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    team: string;
    roleIds: string[];
    effectivePermissions: string[];
  }) => Promise<void>;
}

export function UserEditModal({
  open,
  user,
  roles,
  groups,
  canAssignRole,
  confirmLoading,
  onClose,
  onSubmit,
}: UserEditModalProps) {
  const [form] = Form.useForm<{ name: string; team: string }>();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);

  const id = user?.id ?? "";
  const { data: access, isPending: accessLoading } = useQuery({
    queryKey: adminKeys.access(id),
    queryFn: () => fetchUserAccess(id),
    enabled: open && Boolean(id),
  });

  useEffect(() => {
    if (!open || !user) return;
    form.setFieldsValue({ name: user.name, team: user.team });
  }, [open, user, form]);

  useEffect(() => {
    if (!open || !access) return;
    setRoleIds(access.roles.map((role) => role.id));
    setChecked(access.effective);
  }, [open, access]);

  useEffect(() => {
    if (!open) {
      setRoleIds([]);
      setChecked([]);
    }
  }, [open]);

  function onRoleChange(next: string[]) {
    setRoleIds(next);
    setChecked(permissionsFromRoles(next, roles, groups));
  }

  function save() {
    void form.validateFields().then((values) =>
      onSubmit({
        ...values,
        roleIds,
        effectivePermissions: checked,
      }),
    );
  }

  const roleLabels = roleIds
    .map((rid) => roles.find((r) => r.id === rid)?.name)
    .filter(Boolean);

  return (
    <Modal
      title={user ? `Sửa tài khoản — ${user.name}` : "Sửa tài khoản"}
      open={open}
      width={720}
      confirmLoading={confirmLoading}
      onCancel={onClose}
      onOk={save}
      destroyOnHidden
    >
      <Spin spinning={accessLoading && canAssignRole}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="team" label="Team">
            <Input />
          </Form.Item>
          {user ? (
            <Form.Item label="Email">
              <Input value={user.email} disabled />
            </Form.Item>
          ) : null}
        </Form>

        {canAssignRole ? (
          <>
            <Form.Item label="Role" style={{ marginBottom: 8 }}>
              <Select
                mode="multiple"
                style={{ width: "100%" }}
                value={roleIds}
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.name,
                }))}
                onChange={onRoleChange}
              />
            </Form.Item>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#65676b" }}>
              Quyền theo role
              {roleLabels.length ? ` (${roleLabels.join(", ")})` : ""} — tick
              thêm hoặc bỏ tick để cá nhân hoá tài khoản.
            </p>
            <PermissionMatrix
              groups={groups}
              value={checked}
              onChange={setChecked}
            />
          </>
        ) : null}
      </Spin>
    </Modal>
  );
}
