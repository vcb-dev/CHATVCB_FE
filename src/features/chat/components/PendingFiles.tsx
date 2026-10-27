import { CloseOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { PendingFile } from '@/types';
import { formatBytes } from '../utils/attachments';

export function PendingFiles(props: {
  items: PendingFile[];
  onRemove: (key: string) => void;
}) {
  if (!props.items.length) {
    return null;
  }
  return (
    <div className="pending-files">
      {props.items.map((item) => (
        <div key={item.key} className="pending-file-chip">
          <PaperClipOutlined className="pending-file-ico" />
          <span className="pending-file-name" title={item.file.name}>
            {item.file.name}
          </span>
          <span className="pending-file-size">{formatBytes(item.file.size)}</span>
          <button
            type="button"
            className="pending-file-remove"
            onClick={() => props.onRemove(item.key)}
            aria-label="Xóa tệp"
          >
            <CloseOutlined />
          </button>
        </div>
      ))}
    </div>
  );
}
