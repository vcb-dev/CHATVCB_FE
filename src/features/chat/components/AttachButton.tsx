import { PaperClipOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useRef, type ChangeEvent } from 'react';
import { ACCEPT_FILES } from '../utils/attachments';

export function AttachButton(props: {
  disabled: boolean;
  onAddFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) {
      props.onAddFiles(files);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_FILES}
        multiple
        hidden
        onChange={onPick}
      />
      <Tooltip title="Đính kèm tệp">
        <Button
          type="text"
          shape="circle"
          size="large"
          className="composer-icon"
          icon={<PaperClipOutlined />}
          disabled={props.disabled}
          onClick={() => inputRef.current?.click()}
        />
      </Tooltip>
    </>
  );
}
