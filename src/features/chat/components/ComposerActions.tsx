import { AppstoreOutlined, PictureOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useRef, type ChangeEvent } from 'react';
import { ACCEPT_IMAGES } from '../utils/media';

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
        accept={ACCEPT_IMAGES}
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
