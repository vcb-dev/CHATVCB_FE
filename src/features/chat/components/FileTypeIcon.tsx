import {
  FileExcelOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import type { FileKind } from '../utils/fileKind';

const ICONS: Record<FileKind, typeof FileOutlined> = {
  pdf: FilePdfOutlined,
  word: FileWordOutlined,
  excel: FileExcelOutlined,
  ppt: FilePptOutlined,
  zip: FileZipOutlined,
  txt: FileTextOutlined,
  other: FileOutlined,
};

export function FileTypeIcon(props: { kind: FileKind }) {
  const Icon = ICONS[props.kind];
  return <Icon className={`file-card-ico file-${props.kind}`} />;
}
