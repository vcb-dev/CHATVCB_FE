import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/FormField";
import type { AdminRole } from "../types";

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  team?: string;
  roleIds?: string[];
};

interface UserFormModalProps {
  open: boolean;
  roles: AdminRole[];
  confirmLoading: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

export function UserFormModal({
  open,
  roles,
  confirmLoading,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const { control, handleSubmit, reset } = useForm<UserFormValues>({
    mode: "onChange",
  });
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  return (
    <Modal
      title="Tạo tài khoản"
      open={open}
      confirmLoading={confirmLoading}
      onCancel={onClose}
      onOk={() => void handleSubmit(onSubmit)()}
      destroyOnHidden
    >
      <Form layout="vertical">
        <FormField
          control={control}
          name="name"
          label="Họ tên"
          rules={{ required: "Nhập họ tên" }}
        >
          <Input />
        </FormField>
        <FormField
          control={control}
          name="email"
          label="Email / tài khoản"
          rules={{ required: "Nhập email hoặc tài khoản" }}
        >
          <Input placeholder="sale4 hoặc sale4@chatvcb.vn" />
        </FormField>
        <FormField control={control} name="password" label="Mật khẩu">
          <Input.Password placeholder="Trống = hệ thống tạo, hiện 1 lần" />
        </FormField>
        <FormField control={control} name="team" label="Team">
          <Input placeholder="sale" />
        </FormField>
        <FormField control={control} name="roleIds" label="Role">
          <Select
            mode="multiple"
            options={roles.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            placeholder="Mặc định: Nhân viên"
          />
        </FormField>
      </Form>
    </Modal>
  );
}
