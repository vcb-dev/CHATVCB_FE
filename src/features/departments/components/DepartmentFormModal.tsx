import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { OrgDepartment, OrgUnitStatus } from '../types';

export interface DepartmentFormValues {
  name: string;
  code: string;
  status: OrgUnitStatus;
}

interface DepartmentFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: OrgDepartment | null;
  confirmLoading?: boolean;
  onClose: () => void;
  onSubmit: (values: DepartmentFormValues) => void | Promise<void>;
}

const CODE_PATTERN = /^[A-Z0-9_]+$/;

export function DepartmentFormModal({
  open,
  mode,
  initial,
  confirmLoading,
  onClose,
  onSubmit,
}: DepartmentFormModalProps) {
  const [form] = Form.useForm<DepartmentFormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      form.setFieldsValue({
        name: initial.name,
        code: initial.code,
        status: initial.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
  }, [open, mode, initial, form]);

  async function handleOk() {
    const values = await form.validateFields();
    const code = values.code.trim().toUpperCase();
    await onSubmit({ ...values, name: values.name.trim(), code });
  }

  return (
    <Modal
      title={mode === 'create' ? 'Thêm phòng ban' : 'Sửa phòng ban'}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      confirmLoading={confirmLoading}
      destroyOnClose
      okText={mode === 'create' ? 'Thêm' : 'Lưu'}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="name"
          label="Tên phòng ban"
          rules={[
            { required: true, message: 'Nhập tên phòng ban.' },
            { min: 2, message: 'Tối thiểu 2 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Phòng Marketing" maxLength={120} />
        </Form.Item>
        <Form.Item
          name="code"
          label="Mã phòng ban"
          rules={[
            { required: true, message: 'Nhập mã phòng ban.' },
            {
              validator: (_, value: unknown) => {
                const code = String(value ?? '').trim().toUpperCase();
                if (!code) return Promise.resolve();
                return CODE_PATTERN.test(code)
                  ? Promise.resolve()
                  : Promise.reject(new Error('Chỉ dùng A–Z, 0–9 và dấu gạch dưới.'));
              },
            },
          ]}
        >
          <Input
            placeholder="VD: PHONG_MARKETING"
            maxLength={64}
            onBlur={() => {
              const raw = form.getFieldValue('code') as string | undefined;
              if (raw) form.setFieldValue('code', raw.trim().toUpperCase());
            }}
          />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'inactive', label: 'Ngưng' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
