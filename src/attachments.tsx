import { useRef, type ChangeEvent } from 'react';
import { Button, Tooltip } from 'antd';
import {
  CloseOutlined,
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import { fileSrc } from './api';
import type { PendingFile } from './types';

export const ACCEPT_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PENDING_FILES = 5;

const ALLOWED_EXTS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'zip',
]);

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return 'Tệp tối đa 10MB.';
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTS.has(ext)) {
    return 'Chỉ nhận PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP.';
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function addPendingDocs(
  current: PendingFile[],
  files: File[],
): { next: PendingFile[]; error: string | null } {
  let error: string | null = null;
  const next = [...current];
  for (const file of files) {
    if (next.length >= MAX_PENDING_FILES) {
      error = `Tối đa ${MAX_PENDING_FILES} tệp chờ gửi.`;
      break;
    }
    const err = validateFile(file);
    if (err) {
      error = err;
      continue;
    }
    next.push({
      key: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
      file,
    });
  }
  return { next, error };
}

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

export function FileCard(props: {
  name: string;
  sizeBytes?: number | null;
  url: string;
  mimeType?: string | null;
}) {
  const ext = props.name.split('.').pop()?.toLowerCase() ?? '';
  let icon = <FileOutlined className="file-card-ico" />;
  let colorClass = 'file-other';

  if (ext === 'pdf' || props.mimeType?.includes('pdf')) {
    icon = <FilePdfOutlined className="file-card-ico file-pdf" />;
    colorClass = 'file-pdf';
  } else if (['doc', 'docx'].includes(ext) || props.mimeType?.includes('word')) {
    icon = <FileWordOutlined className="file-card-ico file-word" />;
    colorClass = 'file-word';
  } else if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    props.mimeType?.includes('excel') ||
    props.mimeType?.includes('spreadsheet')
  ) {
    icon = <FileExcelOutlined className="file-card-ico file-excel" />;
    colorClass = 'file-excel';
  } else if (
    ['ppt', 'pptx'].includes(ext) ||
    props.mimeType?.includes('presentation') ||
    props.mimeType?.includes('powerpoint')
  ) {
    icon = <FilePptOutlined className="file-card-ico file-ppt" />;
    colorClass = 'file-ppt';
  } else if (ext === 'zip' || props.mimeType?.includes('zip')) {
    icon = <FileZipOutlined className="file-card-ico file-zip" />;
    colorClass = 'file-zip';
  } else if (ext === 'txt' || props.mimeType?.includes('text/plain')) {
    icon = <FileTextOutlined className="file-card-ico file-txt" />;
    colorClass = 'file-txt';
  }

  return (
    <a
      href={fileSrc(props.url)}
      target="_blank"
      rel="noreferrer"
      download={props.name}
      className={`file-card ${colorClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="file-card-icon-box">{icon}</div>
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
