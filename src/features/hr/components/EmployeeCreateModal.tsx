import { Form, Input, Modal } from "antd";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/FormField";

type EmployeeCreateValues = {
  fullName: string;
  email: string;
  password?: string;
};

interface EmployeeCreateModalProps {
  open: boolean;
  confirmLoading: boolean;
  onClose: () => void;
  onSubmit: (values: EmployeeCreateValues) => Promise<void>;
}

export function EmployeeCreateModal({
  open,
  confirmLoading,
  onClose,
  onSubmit,
}: EmployeeCreateModalProps) {
  const { control, handleSubmit, reset } = useForm<EmployeeCreateValues>({
    mode: "onChange",
  });
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  return (
    <Modal
      title="Thêm nhân viên"
      open={open}
      confirmLoading={confirmLoading}
      onCancel={onClose}
      onOk={() => void handleSubmit(onSubmit)()}
      destroyOnHidden
    >
      <Form layout="vertical">
        <FormField
          control={control}
          name="fullName"
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
          <Input placeholder="nv01 hoặc nv01@chatvcb.vn" />
        </FormField>
        <FormField control={control} name="password" label="Mật khẩu">
          <Input.Password placeholder="Trống = hệ thống tạo, hiện 1 lần" />
        </FormField>
      </Form>
    </Modal>
  );
}
