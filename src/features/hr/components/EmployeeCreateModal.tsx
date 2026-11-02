import { Form, Input, Modal } from "antd";
import { useEffect } from "react";

interface EmployeeCreateModalProps {
  open: boolean;
  confirmLoading: boolean;
  onClose: () => void;
  onSubmit: (values: {
    fullName: string;
    email: string;
    password?: string;
  }) => Promise<void>;
}

export function EmployeeCreateModal({
  open,
  confirmLoading,
  onClose,
  onSubmit,
}: EmployeeCreateModalProps) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  return (
    <Modal
      title="Thêm nhân viên"
      open={open}
      confirmLoading={confirmLoading}
      onCancel={onClose}
      onOk={() => void form.validateFields().then(onSubmit)}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email / tài khoản"
          rules={[{ required: true }]}
        >
          <Input placeholder="nv01 hoặc nv01@chatvcb.vn" />
        </Form.Item>
        <Form.Item name="password" label="Mật khẩu">
          <Input.Password placeholder="Trống = hệ thống tạo, hiện 1 lần" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
