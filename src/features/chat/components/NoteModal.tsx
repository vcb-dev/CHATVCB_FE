import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/api/client';
import { FormField } from '@/components/FormField';
import { queryKeys } from '@/api/queryKeys';
import type { RoomNote } from '@/types';
import { errorText } from '@/lib/errors';
import { formatShort } from '../utils/datetime';

type NoteFormValues = { title: string; content: string };

type Props = {
  open: boolean;
  roomId: string;
  note: RoomNote | null;
  canEdit: boolean;
  onClose: () => void;
};

export function NoteModal({
  open,
  roomId,
  note,
  canEdit,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    control,
    handleSubmit: submitForm,
    reset,
    formState: { isValid },
  } = useForm<NoteFormValues>({ mode: 'onChange', defaultValues: { title: '', content: '' } });

  useEffect(() => {
    if (open) {
      reset(note ? { title: note.title, content: note.content } : { title: '', content: '' });
    }
  }, [open, note, reset]);

  // Tiêu đề trống: nút Lưu đã khoá (luật của form), không tới được đây
  const handleSubmit = async ({ title, content }: NoteFormValues) => {
    const t = title.trim();
    try {
      setLoading(true);
      if (note) {
        await api.updateNote(roomId, note.id, {
          title: t,
          content,
        });
        message.success('Đã cập nhật ghi chú');
      } else {
        await api.createNote(roomId, {
          title: t,
          content,
        });
        message.success('Đã tạo ghi chú');
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.notes(roomId),
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      message.error(msg);
      if (err instanceof ApiError && err.status === 404) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.notes(roomId),
        });
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    Modal.confirm({
      title: 'Xóa ghi chú?',
      content: 'Bạn có chắc chắn muốn xóa ghi chú này không?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setDeleting(true);
          await api.deleteNote(roomId, note.id);
          message.success('Đã xóa ghi chú');
          await queryClient.invalidateQueries({
            queryKey: queryKeys.notes(roomId),
          });
          onClose();
        } catch (err) {
          message.error(errorText(err, 'Có lỗi xảy ra'));
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const isEditing = Boolean(note);
  const editable = canEdit || !isEditing;

  return (
    <Modal
      open={open}
      title={
        !editable
          ? 'Xem ghi chú'
          : isEditing
            ? 'Sửa ghi chú'
            : 'Tạo ghi chú'
      }
      onCancel={onClose}
      footer={
        editable ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isEditing && (
                <Button danger loading={deleting} onClick={handleDelete}>
                  Xóa ghi chú
                </Button>
              )}
            </div>
            <div>
              <Button onClick={onClose} style={{ marginRight: 8 }}>
                Hủy
              </Button>
              <Button
                type="primary"
                loading={loading}
                disabled={!isValid}
                onClick={() => void submitForm(handleSubmit)()}
              >
                {isEditing ? 'Lưu' : 'Tạo ghi chú'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onClose}>Đóng</Button>
        )
      }
      destroyOnHidden
    >
      {editable ? (
        <Form layout="vertical" className="mt-3">
          <FormField
            control={control}
            name="title"
            label="Tiêu đề"
            rules={{ required: true, validate: (value) => Boolean(value.trim()) }}
          >
            <Input placeholder="Nhập tiêu đề ghi chú..." maxLength={120} />
          </FormField>

          <FormField control={control} name="content" label="Nội dung">
            <Input.TextArea
              placeholder="Nhập nội dung ghi chú..."
              maxLength={4000}
              autoSize={{ minRows: 6, maxRows: 16 }}
            />
          </FormField>
        </Form>
      ) : note ? (
        <div className="note-view" style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
            {note.title}
          </h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--ui-text)' }}>
            {note.content}
          </p>
          <div style={{ marginTop: 16, borderTop: '1px solid var(--ui-border)', paddingTop: 8, fontSize: 12, color: 'var(--ui-text-3)' }}>
            <div>Tạo bởi: {note.creatorName} lúc {formatShort(note.createdAt)}</div>
            {note.updatedByName && (
              <div style={{ marginTop: 4 }}>
                Sửa lần cuối bởi: {note.updatedByName} lúc {formatShort(note.updatedAt)}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
