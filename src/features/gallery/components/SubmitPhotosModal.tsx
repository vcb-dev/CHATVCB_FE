import { CameraOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, Segmented, Select, Spin, message } from 'antd';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api, fileSrc } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { errorText } from '@/lib/errors';
import { ACCEPT_IMAGES, imageFileError } from '@/lib/image';
import type { GalleryVisibility } from '@/types';
import { PHOTO_MAX_PER_SEND, PHOTO_SEND_CONCURRENCY } from '../utils/photoFiles';
import { runPool } from '../utils/runPool';
import { CameraCapture } from './CameraCapture';

export type SubmitItem = {
  key: string;
  previewUrl: string;
  state: 'waiting' | 'sending' | 'done' | 'error';
  error?: string;
} & ({ kind: 'file'; blob: Blob; filename: string } | { kind: 'chat'; imageId: string });

function revokePreview(item: SubmitItem) {
  if (item.kind === 'file') {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function SubmitPhotosModal(props: {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  chatImages?: { id: string; url: string }[];
}) {
  const { open, onClose, onSent, chatImages } = props;
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SubmitItem[]>([]);
  const [albumId, setAlbumId] = useState<string | undefined>();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<GalleryVisibility>('public');
  const [sending, setSending] = useState(false);
  const [shooting, setShooting] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const { data: albums = [] } = useQuery({
    queryKey: queryKeys.galleryAlbums,
    queryFn: () => api.galleryAlbums(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems(
      (chatImages ?? []).map((image) => ({
        key: `chat-${image.id}`,
        kind: 'chat',
        imageId: image.id,
        previewUrl: fileSrc(image.url),
        state: 'waiting',
      })),
    );
    setAlbumId(undefined);
    setCaption('');
    setVisibility('public');
    return () => itemsRef.current.forEach(revokePreview);
  }, [open, chatImages]);

  function addFiles(files: { blob: Blob; filename: string; size: number; type: string }[]) {
    const room = PHOTO_MAX_PER_SEND - itemsRef.current.length;
    const accepted: SubmitItem[] = [];
    for (const file of files) {
      const problem = imageFileError(file);
      if (problem) {
        void message.error(`${file.filename}: ${problem}`);
      } else if (accepted.length < room) {
        accepted.push({
          key: crypto.randomUUID(),
          kind: 'file',
          blob: file.blob,
          filename: file.filename,
          previewUrl: URL.createObjectURL(file.blob),
          state: 'waiting',
        });
      } else {
        void message.warning(`Mỗi lần gửi tối đa ${PHOTO_MAX_PER_SEND} ảnh.`);
        break;
      }
    }
    setItems((current) => [...current, ...accepted]);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    addFiles(files.map((file) => ({ blob: file, filename: file.name, size: file.size, type: file.type })));
  }

  function removeItem(item: SubmitItem) {
    revokePreview(item);
    setItems((current) => current.filter((other) => other.key !== item.key));
  }

  function patchItem(key: string, change: Partial<SubmitItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? ({ ...item, ...change } as SubmitItem) : item)),
    );
  }

  async function send() {
    const input = { albumId, caption: caption.trim() || undefined, visibility };
    const pending = items.filter((item) => item.state !== 'done');
    let failed = 0;
    setSending(true);
    await runPool(pending, PHOTO_SEND_CONCURRENCY, async (item) => {
      patchItem(item.key, { state: 'sending', error: undefined });
      try {
        if (item.kind === 'file') {
          await api.submitGalleryPhoto(item.blob, item.filename, input);
        } else {
          await api.submitGalleryPhotoFromChat(item.imageId, input);
        }
        patchItem(item.key, { state: 'done' });
      } catch (err) {
        failed += 1;
        patchItem(item.key, { state: 'error', error: errorText(err, 'Không gửi được ảnh.') });
      }
    });
    setSending(false);
    await queryClient.invalidateQueries({ queryKey: queryKeys.galleryLibrary });
    if (failed) {
      void message.error(`${failed} ảnh chưa gửi được.`);
      return;
    }
    void message.success('Đã gửi ảnh, đang chờ duyệt.');
    onClose();
    onSent?.();
  }

  const started = items.some((item) => item.state !== 'waiting');
  const hasError = items.some((item) => item.state === 'error');

  return (
    <Modal
      open={open}
      title="Gửi ảnh lên thư viện"
      wrapClassName="gallery-submit-modal"
      width={720}
      destroyOnHidden
      closable={!sending}
      keyboard={!sending}
      mask={{ closable: false }}
      onCancel={onClose}
      footer={[
        <Button key="close" disabled={sending} onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="send"
          type="primary"
          loading={sending}
          disabled={!items.length}
          onClick={() => void send()}
        >
          {hasError ? 'Gửi lại ảnh lỗi' : 'Gửi'}
        </Button>,
      ]}
    >
      <div className="gallery-submit">
        <input ref={inputRef} type="file" accept={ACCEPT_IMAGES} multiple hidden onChange={onPick} />
        <div className="gallery-submit-grid">
          {items.map((item) => (
            <div key={item.key} className={`gallery-submit-item ${item.state}`}>
              <img src={item.previewUrl} alt="" />
              {item.state === 'sending' ? <Spin className="gallery-submit-spin" /> : null}
              {item.state === 'done' ? <span className="gallery-submit-state">Đã gửi</span> : null}
              {item.state === 'error' ? (
                <span className="gallery-submit-state failed" title={item.error}>
                  {item.error}
                </span>
              ) : null}
              {!started ? (
                <button
                  type="button"
                  className="gallery-submit-remove"
                  aria-label="Bỏ ảnh"
                  onClick={() => removeItem(item)}
                >
                  <CloseOutlined />
                </button>
              ) : null}
            </div>
          ))}
          {!started ? (
            <button
              type="button"
              className="gallery-submit-add"
              onClick={() => inputRef.current?.click()}
            >
              <PlusOutlined />
              <span>Chọn ảnh</span>
            </button>
          ) : null}
          {!started ? (
            <button type="button" className="gallery-submit-add" onClick={() => setShooting(true)}>
              <CameraOutlined />
              <span>Chụp ảnh</span>
            </button>
          ) : null}
        </div>
        <Select
          allowClear
          disabled={started}
          placeholder="Chọn album (có thể để trống)"
          value={albumId}
          onChange={setAlbumId}
          options={albums.map((album) => ({ value: album.id, label: album.name }))}
        />
        <Input.TextArea
          rows={2}
          maxLength={300}
          disabled={started}
          placeholder="Mô tả (không bắt buộc)"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
        <Segmented<GalleryVisibility>
          disabled={started}
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'public', label: 'Public: mọi nhân viên xem được' },
            { value: 'private', label: 'Private: chỉ người có quyền' },
          ]}
        />
        <CameraCapture
          open={shooting}
          onClose={() => setShooting(false)}
          onCapture={(blob) =>
            addFiles([
              {
                blob,
                filename: `chup-anh-${Date.now()}.jpg`,
                size: blob.size,
                type: blob.type,
              },
            ])
          }
        />
      </div>
    </Modal>
  );
}
