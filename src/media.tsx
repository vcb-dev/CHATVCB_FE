import { AppstoreOutlined, CloseOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Modal, Tooltip } from 'antd';
import { useRef, type ClipboardEvent, type ChangeEvent } from 'react';
import { fileSrc } from './api';
import type { GalleryImage, PendingImage } from './types';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const MAX_PENDING = 8;

export function filesFromClipboard(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  );
  return files;
}

export function addPendingFiles(current: PendingImage[], files: File[]) {
  const next = [...current];
  for (const file of files) {
    if (next.length >= MAX_PENDING) {
      break;
    }
    next.push({
      key: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
      preview: URL.createObjectURL(file),
      file,
    });
  }
  return next;
}

export function addGalleryPick(current: PendingImage[], image: GalleryImage) {
  if (current.length >= MAX_PENDING || current.some((item) => item.imageId === image.id)) {
    return current;
  }
  return [
    ...current,
    {
      key: image.id,
      preview: fileSrc(image.url),
      imageId: image.id,
    },
  ];
}

export function revokePending(items: PendingImage[]) {
  for (const item of items) {
    if (item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
  }
}

export function ComposerActions({
  disabled,
  onAddFiles,
  onOpenGallery,
}: {
  disabled: boolean;
  onAddFiles: (files: File[]) => void;
  onOpenGallery: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) {
      onAddFiles(files);
    }
  }

  return (
    <div className="composer-actions">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={onPick}
      />
      <Tooltip title="Tải ảnh từ máy">
        <Button
          type="text"
          shape="circle"
          size="large"
          className="composer-icon"
          icon={<PictureOutlined />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        />
      </Tooltip>
      <Tooltip title="Bộ sưu tập ảnh">
        <Button
          type="text"
          shape="circle"
          size="large"
          className="composer-icon"
          icon={<AppstoreOutlined />}
          disabled={disabled}
          onClick={onOpenGallery}
        />
      </Tooltip>
    </div>
  );
}

export function PendingPreviews({
  items,
  onRemove,
}: {
  items: PendingImage[];
  onRemove: (key: string) => void;
}) {
  if (!items.length) {
    return null;
  }
  return (
    <div className="pending-images">
      {items.map((item) => (
        <div key={item.key} className="pending-thumb">
          <img src={item.preview} alt="" />
          <button type="button" onClick={() => onRemove(item.key)} aria-label="Xóa ảnh">
            <CloseOutlined />
          </button>
        </div>
      ))}
    </div>
  );
}

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
        accept={ACCEPT}
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
