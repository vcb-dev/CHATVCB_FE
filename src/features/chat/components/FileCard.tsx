import { fileSrc } from '@/api/client';
import { formatBytes } from '../utils/attachments';
import { fileKind } from '../utils/fileKind';
import { useUploadProgress } from '../utils/uploadProgress';
import { FileTypeIcon } from './FileTypeIcon';

export function FileCard(props: {
  name: string;
  sizeBytes?: number | null;
  url: string;
  mimeType?: string | null;
  /** clientId của tin đang gửi: hiện "Đang tải lên x%" thay cho dung lượng */
  uploadKey?: string;
}) {
  const kind = fileKind(props.name, props.mimeType);
  const percent = useUploadProgress(props.uploadKey);

  return (
    <a
      href={fileSrc(props.url)}
      target="_blank"
      rel="noreferrer"
      download={props.name}
      className={`file-card file-${kind}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="file-card-icon-box">
        <FileTypeIcon kind={kind} />
      </div>
      <div className="file-card-meta">
        <strong className="file-card-name" title={props.name}>
          {props.name}
        </strong>
        {percent !== undefined ? (
          <span className="file-card-size file-card-progress">
            Đang tải lên {percent}%{props.sizeBytes ? ` · ${formatBytes(props.sizeBytes)}` : ''}
          </span>
        ) : props.sizeBytes ? (
          <span className="file-card-size">{formatBytes(props.sizeBytes)}</span>
        ) : null}
      </div>
    </a>
  );
}
