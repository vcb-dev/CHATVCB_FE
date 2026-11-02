import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import type { AdminRole } from "../types";

interface UserFormModalProps {
  open: boolean;
  roles: AdminRole[];
  confirmLoading: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    email: string;
    password?: string;
    team?: string;
    roleIds?: string[];
  }) => Promise<void>;
}

export function UserFormModal({
  open,
  roles,
  confirmLoading,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  return (
    <Modal
      title="Tạo tài khoản"
      open={open}
      confirmLoading={confirmLoading}
      onCancel={onClose}
      onOk={() => void form.validateFields().then(onSubmit)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email / tài khoản"
          rules={[{ required: true }]}
        >
          <Input placeholder="sale4 hoặc sale4@chatvcb.vn" />
        </Form.Item>
        <Form.Item name="password" label="Mật khẩu">
          <Input.Password placeholder="Trống = hệ thống tạo, hiện 1 lần" />
        </Form.Item>
        <Form.Item name="team" label="Team">
          <Input placeholder="sale" />
        </Form.Item>
        <Form.Item name="roleIds" label="Role">
          <Select
            mode="multiple"
            options={roles.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            placeholder="Mặc định: Nhân viên"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
