import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/FormField';
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
  const { control, handleSubmit, reset, getValues, setValue } =
    useForm<DepartmentFormValues>({ mode: 'onChange' });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      reset({
        name: initial.name,
        code: initial.code,
        status: initial.status,
      });
    } else {
      reset({ status: 'active' });
    }
  }, [open, mode, initial, reset]);

  async function handleOk(values: DepartmentFormValues) {
    const code = values.code.trim().toUpperCase();
    await onSubmit({ ...values, name: values.name.trim(), code });
  }

  return (
    <Modal
      title={mode === 'create' ? 'Thêm phòng ban' : 'Sửa phòng ban'}
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
          label="Tên phòng ban"
          rules={{
            required: 'Nhập tên phòng ban.',
            minLength: { value: 2, message: 'Tối thiểu 2 ký tự.' },
          }}
        >
          <Input placeholder="VD: Phòng Marketing" maxLength={120} />
        </FormField>
        <FormField
          control={control}
          name="code"
          label="Mã phòng ban"
          rules={{
            required: 'Nhập mã phòng ban.',
            validate: (value: unknown) => {
              const code = String(value ?? '').trim().toUpperCase();
              if (!code) return true;
              return CODE_PATTERN.test(code) || 'Chỉ dùng A–Z, 0–9 và dấu gạch dưới.';
            },
          }}
        >
          <Input
            placeholder="VD: PHONG_MARKETING"
            maxLength={64}
            onBlur={() => {
              const raw = getValues('code') as string | undefined;
              if (raw) setValue('code', raw.trim().toUpperCase(), { shouldValidate: true });
            }}
          />
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
