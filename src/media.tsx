import { AppstoreOutlined, CloseOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Modal, Tooltip } from 'antd';
import { useRef, type ClipboardEvent, type ChangeEvent } from 'react';
import { fileSrc } from './api';
import type { ChatMessage, GalleryImage, PendingImage } from './types';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const MAX_PENDING = 8;

export async function compressImage(file: File, max = 400) {
  if (file.type === 'image/gif' || file.size < 80_000) {
    return file;
  }
  return new Promise<File>((resolve) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.8,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}

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

export function photosFromMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();
  const list: GalleryImage[] = [];
  for (const item of messages) {
    if (item.recalled || !item.imageUrl) {
      continue;
    }
    const id = item.imageId || item.id;
    if (seen.has(id) || seen.has(item.imageUrl)) {
      continue;
    }
    seen.add(id);
    seen.add(item.imageUrl);
    list.push({
      id,
      filename: 'Ảnh',
      url: item.imageUrl,
      createdAt: item.createdAt,
    });
  }
  return list;
}

export function mergePhotos(...groups: GalleryImage[][]) {
  const seen = new Set<string>();
  const list: GalleryImage[] = [];
  for (const group of groups) {
    for (const item of group) {
      if (!item.url || seen.has(item.id) || seen.has(item.url)) {
        continue;
      }
      seen.add(item.id);
      seen.add(item.url);
      list.push(item);
    }
  }
  return list;
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
