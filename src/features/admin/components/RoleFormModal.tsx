import { Button, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import type { AdminRole, PermissionGroup } from "../types";
import { permissionsForRoleEditor } from "../permissionCatalog";
import { PermissionMatrix } from "./PermissionMatrix";

interface RoleFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  role: AdminRole | null;
  roles: AdminRole[];
  groups: PermissionGroup[];
  confirmLoading: boolean;
  deleteLoading?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onSubmit: (values: {
    name: string;
    description?: string;
    cloneFromRoleId?: string;
    permissions: string[];
  }) => Promise<void>;
}

export function RoleFormModal({
  open,
  mode,
  role,
  roles,
  groups,
  confirmLoading,
  deleteLoading,
  canDelete,
  onClose,
  onDelete,
  onSubmit,
}: RoleFormModalProps) {
  const [form] = Form.useForm<{ name: string; description?: string }>();
  const [cloneFromRoleId, setCloneFromRoleId] = useState<string | undefined>();
  const [permissions, setPermissions] = useState<string[]>([]);
  const locked = role?.key === "admin";
  const showDelete =
    mode === "edit" &&
    canDelete &&
    role &&
    !role.isSystem &&
    Boolean(onDelete);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: role?.name ?? "",
      description: role?.description ?? "",
    });
    setCloneFromRoleId(undefined);
    setPermissions(role?.permissions ?? []);
  }, [open, role, form]);

  function save() {
    void form.validateFields().then((values) =>
      onSubmit({
        ...values,
        cloneFromRoleId: mode === "create" ? cloneFromRoleId : undefined,
        permissions: permissionsForRoleEditor(permissions, groups),
      }),
    );
  }

  return (
    <Modal
      title={mode === "create" ? "Tạo role" : `Sửa ${role?.name ?? ""}`}
      open={open}
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: locked && mode === "edit" }}
      onCancel={onClose}
      onOk={showDelete ? undefined : save}
      footer={
        showDelete
          ? [
              <Button
                key="delete"
                danger
                loading={deleteLoading}
                onClick={() => void onDelete?.()}
              >
                Xóa role
              </Button>,
              <Button key="cancel" onClick={onClose}>
                Hủy
              </Button>,
              <Button
                key="save"
                type="primary"
                loading={confirmLoading}
                disabled={locked}
                onClick={save}
              >
                Lưu
              </Button>,
            ]
          : undefined
      }
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
          <Input placeholder="ADMIN, Trưởng phòng…" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
      {mode === "create" ? (
        <div style={{ marginBottom: 16 }}>
          <div className="admin-field-label">Sao chép quyền từ</div>
          <Select
            allowClear
            placeholder="Không copy"
            style={{ width: "100%" }}
            value={cloneFromRoleId}
            options={roles.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(id) => {
              setCloneFromRoleId(id);
              const source = roles.find((item) => item.id === id);
              if (source) {
                setPermissions(
                  permissionsForRoleEditor(source.permissions, groups),
                );
              }
            }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#65676b" }}>
            Copy từ Admin hệ thống sẽ tick đủ quyền (role mới không dùng *).
          </p>
        </div>
      ) : null}
      {locked ? (
        <p>Role admin hệ thống luôn full quyền, không sửa được.</p>
      ) : (
        <PermissionMatrix
          groups={groups}
          value={permissions}
          onChange={setPermissions}
        />
      )}
    </Modal>
  );
}
