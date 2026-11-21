import { Button, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/FormField";
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
  const { control, handleSubmit, reset } = useForm<{
    name: string;
    description?: string;
  }>({ mode: "onChange" });
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
    reset({
      name: role?.name ?? "",
      description: role?.description ?? "",
    });
    setCloneFromRoleId(undefined);
    setPermissions(role?.permissions ?? []);
  }, [open, role, reset]);

  function save() {
    void handleSubmit((values) =>
      onSubmit({
        ...values,
        cloneFromRoleId: mode === "create" ? cloneFromRoleId : undefined,
        permissions: permissionsForRoleEditor(permissions, groups),
      }),
    )();
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
      <Form layout="vertical">
        <FormField
          control={control}
          name="name"
          label="Tên"
          rules={{ required: "Nhập tên role" }}
        >
          <Input placeholder="ADMIN, Trưởng phòng…" />
        </FormField>
        <FormField control={control} name="description" label="Mô tả">
          <Input.TextArea rows={2} />
        </FormField>
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
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ui-text-3)" }}>
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
