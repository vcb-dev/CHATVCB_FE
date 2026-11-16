import { fileSrc } from '@/api/client';
import { formatBytes } from '../utils/attachments';
import { fileKind } from '../utils/fileKind';
import { FileTypeIcon } from './FileTypeIcon';

export function FileCard(props: {
  name: string;
  sizeBytes?: number | null;
  url: string;
  mimeType?: string | null;
}) {
  const kind = fileKind(props.name, props.mimeType);

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
        {props.sizeBytes ? (
          <span className="file-card-size">{formatBytes(props.sizeBytes)}</span>
        ) : null}
      </div>
    </a>
  );
}
