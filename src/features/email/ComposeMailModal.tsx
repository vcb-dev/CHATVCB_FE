import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { FormField } from '@/components/FormField';
import type { MailAccount } from '@/types';
import type { ComposeDraft } from './utils/compose';

/** Soạn thư mới hoặc trả lời. `draft` null là đóng. */
export function ComposeMailModal(props: {
  account: MailAccount;
  draft: ComposeDraft | null;
  onClose: () => void;
}) {
  const { account, draft, onClose } = props;
  const { control, handleSubmit, reset } = useForm<ComposeDraft>({ mode: 'onChange' });
  const [sending, setSending] = useState(false);
  const replying = Boolean(draft?.replyUid);

  useEffect(() => {
    if (draft) {
      reset(draft);
    }
  }, [draft, reset]);

  async function send(values: ComposeDraft) {
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
      onOk={() => void handleSubmit(send)()}
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
      <Form layout="vertical" requiredMark={false}>
        <FormField
          control={control}
          name="to"
          label="Đến"
          rules={{ validate: (value) => Boolean(value?.trim()) || 'Nhập người nhận.' }}
        >
          <Input placeholder="ten@congty.com, nhiều người cách nhau dấu phẩy" autoComplete="off" />
        </FormField>
        <FormField control={control} name="cc" label="Cc">
          <Input placeholder="Không bắt buộc" autoComplete="off" />
        </FormField>
        <FormField control={control} name="subject" label="Tiêu đề">
          <Input maxLength={500} />
        </FormField>
        <FormField control={control} name="text" label="Nội dung">
          <Input.TextArea autoSize={{ minRows: 8, maxRows: 18 }} maxLength={200_000} />
        </FormField>
      </Form>
    </Modal>
  );
}
