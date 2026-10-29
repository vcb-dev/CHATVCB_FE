import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { OrgGroup, OrgUnitStatus } from '../types';

export interface DepartmentGroupFormValues {
  name: string;
  leaderName: string;
  memberCount: number;
  status: OrgUnitStatus;
}

interface DepartmentGroupFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  departmentName: string;
  initial?: OrgGroup | null;
  confirmLoading?: boolean;
  onClose: () => void;
  onSubmit: (values: DepartmentGroupFormValues) => void | Promise<void>;
}

export function DepartmentGroupFormModal({
  open,
  mode,
  departmentName,
  initial,
  confirmLoading,
  onClose,
  onSubmit,
}: DepartmentGroupFormModalProps) {
  const [form] = Form.useForm<DepartmentGroupFormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      form.setFieldsValue({
        name: initial.name,
        leaderName: initial.leaderName ?? '',
        memberCount: initial.memberCount,
        status: initial.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active', memberCount: 0, leaderName: '' });
    }
  }, [open, mode, initial, form]);

  async function handleOk() {
    const values = await form.validateFields();
    await onSubmit({
      ...values,
      name: values.name.trim(),
      leaderName: values.leaderName.trim(),
    });
  }

  return (
    <Modal
      title={
        mode === 'create'
          ? `Thêm nhóm — ${departmentName}`
          : `Sửa nhóm — ${departmentName}`
      }
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
          label="Tên nhóm"
          rules={[
            { required: true, message: 'Nhập tên nhóm.' },
            { min: 2, message: 'Tối thiểu 2 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Nhóm B2B Miền Bắc" maxLength={120} />
        </Form.Item>
        <Form.Item name="leaderName" label="Trưởng nhóm">
          <Input placeholder="Tùy chọn" maxLength={120} allowClear />
        </Form.Item>
        <Form.Item
          name="memberCount"
          label="Số thành viên (tạm thời)"
          rules={[{ required: true, message: 'Nhập số thành viên.' }]}
        >
          <InputNumber min={0} max={100_000} style={{ width: '100%' }} />
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
