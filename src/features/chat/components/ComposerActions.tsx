import { PictureOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useRef, type ChangeEvent } from 'react';
import { ACCEPT_IMAGES } from '@/lib/image';

export function ComposerActions({
  disabled,
  onAddFiles,
}: {
  disabled: boolean;
  onAddFiles: (files: File[]) => void;
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
          className="composer-tool"
          icon={<PictureOutlined />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        />
      </Tooltip>
    </div>
  );
}
