import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
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
  const { control, handleSubmit, reset } = useForm<DepartmentGroupFormValues>({
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      reset({
        name: initial.name,
        leaderName: initial.leaderName ?? '',
        memberCount: initial.memberCount,
        status: initial.status,
      });
    } else {
      reset({ status: 'active', memberCount: 0, leaderName: '' });
    }
  }, [open, mode, initial, reset]);

  async function handleOk(values: DepartmentGroupFormValues) {
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
      onOk={() => void handleSubmit(handleOk)()}
      confirmLoading={confirmLoading}
      destroyOnClose
      okText={mode === 'create' ? 'Thêm' : 'Lưu'}
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <FormField
          control={control}
          name="name"
          label="Tên nhóm"
          rules={{
            required: 'Nhập tên nhóm.',
            minLength: { value: 2, message: 'Tối thiểu 2 ký tự.' },
          }}
        >
          <Input placeholder="VD: Nhóm B2B Miền Bắc" maxLength={120} />
        </FormField>
        <FormField control={control} name="leaderName" label="Trưởng nhóm">
          <Input placeholder="Tùy chọn" maxLength={120} allowClear />
        </FormField>
        <FormField
          control={control}
          name="memberCount"
          label="Số thành viên (tạm thời)"
          rules={{ required: 'Nhập số thành viên.' }}
        >
          <InputNumber min={0} max={100_000} style={{ width: '100%' }} />
        </FormField>
        <FormField
          control={control}
          name="status"
          label="Trạng thái"
          rules={{ required: 'Chọn trạng thái.' }}
        >
          <Select
            options={[
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'inactive', label: 'Ngưng' },
            ]}
          />
        </FormField>
      </Form>
    </Modal>
  );
}
