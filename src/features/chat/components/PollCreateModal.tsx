import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Modal, Typography, message as antMessage } from 'antd';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { api } from '@/api/client';
import type { ChatMessage } from '@/types';
import { errorText } from '@/lib/errors';
import { fromLocalInput } from '../utils/datetime';

const { Text } = Typography;

type PollFormValues = {
  question: string;
  /** useFieldArray cần object, không nhận mảng chuỗi */
  options: { text: string }[];
  multiple: boolean;
  allowAddOptions: boolean;
  closesAt: string;
};

const EMPTY_POLL: PollFormValues = {
  question: '',
  options: [{ text: '' }, { text: '' }],
  multiple: false,
  allowAddOptions: false,
  closesAt: '',
};

export function PollCreateModal(props: {
  open: boolean;
  roomId: string;
  onClose: () => void;
  onCreated: (m: ChatMessage) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit: submitForm,
    reset,
    formState: { isValid },
  } = useForm<PollFormValues>({ mode: 'onChange', defaultValues: EMPTY_POLL });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
    // Cần ít nhất 2 phương án có chữ
    rules: { validate: (options) => options.filter((o) => o.text.trim()).length >= 2 },
  });

  const handleClose = () => {
    reset();
    setSubmitting(false);
    props.onClose();
  };

  const handleSubmit = async (values: PollFormValues) => {
    setSubmitting(true);
    try {
      const msg = await api.createPoll(props.roomId, {
        question: values.question.trim(),
        options: values.options.map((o) => o.text.trim()).filter(Boolean),
        multiple: values.multiple,
        allowAddOptions: values.allowAddOptions,
        closesAt: values.closesAt ? fromLocalInput(values.closesAt) : undefined,
      });
      props.onCreated(msg);
      handleClose();
    } catch (err) {
      void antMessage.error(errorText(err, 'Tạo bình chọn thất bại.'));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo bình chọn"
      open={props.open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          disabled={!isValid || submitting}
          onClick={() => void submitForm(handleSubmit)()}
        >
          Tạo bình chọn
        </Button>,
      ]}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
        <div>
          <Text strong>Câu hỏi bình chọn</Text>
          <Controller
            control={control}
            name="question"
            rules={{ validate: (value) => Boolean(value.trim()) }}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                placeholder="Nhập câu hỏi bình chọn (tối đa 200 ký tự)..."
                maxLength={200}
                rows={2}
                style={{ marginTop: 6 }}
              />
            )}
          />
        </div>

        <div>
          <Text strong>Các phương án</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {fields.map((item, idx) => (
              // key theo id của useFieldArray: xoá phương án giữa không làm chữ các ô sau bị lệch
              <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Controller
                  control={control}
                  name={`options.${idx}.text`}
                  render={({ field }) => (
                    <Input {...field} placeholder={`Phương án ${idx + 1}`} maxLength={100} />
                  )}
                />
                {fields.length > 2 ? (
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => remove(idx)}
                  />
                ) : null}
              </div>
            ))}
          </div>
          {fields.length < 10 ? (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => append({ text: '' }, { shouldFocus: false })}
              style={{ width: '100%', marginTop: 8 }}
            >
              Thêm phương án
            </Button>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Text strong>Tùy chọn</Text>
          <Controller
            control={control}
            name="multiple"
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Cho chọn nhiều phương án
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="allowAddOptions"
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)}>
                Cho thành viên thêm phương án
              </Checkbox>
            )}
          />
        </div>

        <div>
          <Text strong>Thời hạn bình chọn (không bắt buộc)</Text>
          <Controller
            control={control}
            name="closesAt"
            render={({ field }) => (
              <Input {...field} type="datetime-local" style={{ marginTop: 6 }} />
            )}
          />
        </div>
      </div>
    </Modal>
  );
}
