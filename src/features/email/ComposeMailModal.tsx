import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { MailAccount } from '@/types';
import type { ComposeDraft } from './utils/compose';

/** Soạn thư mới hoặc trả lời. `draft` null là đóng. */
export function ComposeMailModal(props: {
  account: MailAccount;
  draft: ComposeDraft | null;
  onClose: () => void;
}) {
  const { account, draft, onClose } = props;
  const [form] = Form.useForm<ComposeDraft>();
  const [sending, setSending] = useState(false);
  const replying = Boolean(draft?.replyUid);

  useEffect(() => {
    if (draft) {
      form.resetFields();
      form.setFieldsValue(draft);
    }
  }, [draft, form]);

  async function send() {
    let values: ComposeDraft;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSending(true);
    try {
      const result = await api.sendMail(account.id, {
        to: values.to,
        cc: values.cc?.trim() || undefined,
        subject: values.subject || '',
        text: values.text || '',
        replyUid: draft?.replyUid,
      });
      message.success(result.savedToSent ? 'Đã gửi thư.' : 'Đã gửi thư, nhưng không chép được vào thư mục Đã gửi.');
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không gửi được thư.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title={replying ? 'Trả lời' : 'Thư mới'}
      open={Boolean(draft)}
      onCancel={onClose}
      onOk={() => void send()}
      okText="Gửi"
      cancelText="Huỷ"
      confirmLoading={sending}
      // Bấm nhầm ra ngoài không mất thư đang soạn
      maskClosable={false}
      width={640}
      forceRender
      className="mail-compose"
    >
      <p className="mail-compose-from">
        Từ: <strong>{account.displayName && account.displayName !== account.email ? `${account.displayName} <${account.email}>` : account.email}</strong>
      </p>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="to"
          label="Đến"
          rules={[{ required: true, whitespace: true, message: 'Nhập người nhận.' }]}
        >
          <Input placeholder="ten@congty.com, nhiều người cách nhau dấu phẩy" autoComplete="off" />
        </Form.Item>
        <Form.Item name="cc" label="Cc">
          <Input placeholder="Không bắt buộc" autoComplete="off" />
        </Form.Item>
        <Form.Item name="subject" label="Tiêu đề">
          <Input maxLength={500} />
        </Form.Item>
        <Form.Item name="text" label="Nội dung">
          <Input.TextArea autoSize={{ minRows: 8, maxRows: 18 }} maxLength={200_000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
