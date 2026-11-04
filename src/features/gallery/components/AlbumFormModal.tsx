import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import type { GalleryAlbum } from '@/types';

type Values = { name: string; description?: string };

/** `album` là null khi tạo mới */
export function AlbumFormModal(props: {
  open: boolean;
  album: GalleryAlbum | null;
  onClose: () => void;
}) {
  const { open, album, onClose } = props;
  const queryClient = useQueryClient();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ name: album?.name ?? '', description: album?.description ?? '' });
    }
  }, [open, album, form]);

  async function save(values: Values) {
    setSaving(true);
    try {
      if (album) {
        await api.updateGalleryAlbum(album.id, values);
      } else {
        await api.createGalleryAlbum(values);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.galleryLibrary });
      onClose();
    } catch (err) {
      message.error(errorText(err, 'Không lưu được album.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={album ? 'Sửa album' : 'Tạo album'}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saving}
      onOk={() => form.submit()}
      onCancel={onClose}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
        <Form.Item
          name="name"
          label="Tên album"
          rules={[{ required: true, whitespace: true, message: 'Nhập tên album' }]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
