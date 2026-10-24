import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Modal, Typography, message as antMessage } from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import type { ChatMessage } from '@/types';
import { errorText } from '@/lib/errors';
import { fromLocalInput } from '../utils/datetime';

const { Text } = Typography;

export function PollCreateModal(props: {
  open: boolean;
  roomId: string;
  onClose: () => void;
  onCreated: (m: ChatMessage) => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [multiple, setMultiple] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [closesAt, setClosesAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultiple(false);
    setAllowAddOptions(false);
    setClosesAt('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    props.onClose();
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptions((current) => {
      const next = [...current];
      next[index] = val;
      return next;
    });
  };

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions((current) => [...current, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions((current) => current.filter((_, idx) => idx !== index));
    }
  };

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && validOptions.length >= 2 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      const msg = await api.createPoll(props.roomId, {
        question: question.trim(),
        options: validOptions,
        multiple,
        allowAddOptions,
        closesAt: closesAt ? fromLocalInput(closesAt) : undefined,
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
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          Tạo bình chọn
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
        <div>
          <Text strong>Câu hỏi bình chọn</Text>
          <Input.TextArea
            placeholder="Nhập câu hỏi bình chọn (tối đa 200 ký tự)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            rows={2}
            style={{ marginTop: 6 }}
          />
        </div>

        <div>
          <Text strong>Các phương án</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  placeholder={`Phương án ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 ? (
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleRemoveOption(idx)}
                  />
                ) : null}
              </div>
            ))}
          </div>
          {options.length < 10 ? (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddOption}
              style={{ width: '100%', marginTop: 8 }}
            >
              Thêm phương án
            </Button>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Text strong>Tùy chọn</Text>
          <Checkbox checked={multiple} onChange={(e) => setMultiple(e.target.checked)}>
            Cho chọn nhiều phương án
          </Checkbox>
          <Checkbox
            checked={allowAddOptions}
            onChange={(e) => setAllowAddOptions(e.target.checked)}
          >
            Cho thành viên thêm phương án
          </Checkbox>
        </div>

        <div>
          <Text strong>Thời hạn bình chọn (không bắt buộc)</Text>
          <Input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            style={{ marginTop: 6 }}
          />
        </div>
      </div>
    </Modal>
  );
}
