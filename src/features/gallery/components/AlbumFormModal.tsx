import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { FormField } from '@/components/FormField';
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
  const { control, handleSubmit, reset } = useForm<Values>({ mode: 'onChange' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      reset({ name: album?.name ?? '', description: album?.description ?? '' });
    }
  }, [open, album, reset]);

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
      onOk={() => void handleSubmit(save)()}
      onCancel={onClose}
      forceRender
    >
      {/* Enter trong ô tên vẫn lưu như trước: antd gọi onFinish khi form submit */}
      <Form layout="vertical" onFinish={() => void handleSubmit(save)()}>
        <FormField
          control={control}
          name="name"
          label="Tên album"
          rules={{ validate: (value) => Boolean(value?.trim()) || 'Nhập tên album' }}
          required
        >
          <Input maxLength={100} />
        </FormField>
        <FormField control={control} name="description" label="Mô tả">
          <Input.TextArea rows={2} maxLength={500} />
        </FormField>
      </Form>
    </Modal>
  );
}
