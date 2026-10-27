import { PlusOutlined } from '@ant-design/icons';
import { Image, Modal } from 'antd';
import { useRef, type ChangeEvent } from 'react';
import { fileSrc } from '@/api/client';
import type { GalleryImage } from '@/types';
import { ACCEPT_IMAGES } from '../utils/media';

export function GalleryModal({
  open,
  loading,
  images,
  onClose,
  onPick,
  onAddFiles,
}: {
  open: boolean;
  loading: boolean;
  images: GalleryImage[];
  onClose: () => void;
  onPick: (image: GalleryImage) => void;
  onAddFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) {
      onAddFiles(files);
    }
  }

  return (
    <Modal
      title="Bộ sưu tập ảnh"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_IMAGES}
        multiple
        hidden
        onChange={onPickFiles}
      />
      <div className="gallery-grid">
        <button
          type="button"
          className="gallery-item gallery-add"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <PlusOutlined />
          <span>Thêm ảnh</span>
        </button>
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            className="gallery-item"
            onClick={() => onPick(image)}
          >
            <Image src={fileSrc(image.url)} alt={image.filename} preview={false} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
