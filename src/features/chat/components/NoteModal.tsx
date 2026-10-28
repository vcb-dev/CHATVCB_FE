import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { RoomNote } from '@/types';
import { errorText } from '@/lib/errors';
import { formatShort } from '../utils/datetime';

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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title);
        setContent(note.content);
      } else {
        setTitle('');
        setContent('');
      }
    }
  }, [open, note]);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      message.error('Tiêu đề không được trống.');
      return;
    }

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
      if (msg.includes('Không tìm thấy ghi chú')) {
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
                disabled={!title.trim()}
                onClick={handleSubmit}
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
          <Form.Item label="Tiêu đề" required>
            <Input
              placeholder="Nhập tiêu đề ghi chú..."
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="Nội dung">
            <Input.TextArea
              placeholder="Nhập nội dung ghi chú..."
              maxLength={4000}
              autoSize={{ minRows: 6, maxRows: 16 }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Form.Item>
        </Form>
      ) : note ? (
        <div className="note-view" style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 600 }}>
            {note.title}
          </h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#333' }}>
            {note.content}
          </p>
          <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 8, fontSize: 12, color: '#888' }}>
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
