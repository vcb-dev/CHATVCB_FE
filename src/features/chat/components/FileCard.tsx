import {
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { fileSrc } from '@/api/client';
import { formatBytes } from '../utils/attachments';

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
