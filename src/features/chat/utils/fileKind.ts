export type FileKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'zip' | 'txt' | 'other';

/** Loại tệp để chọn biểu tượng và màu: xét đuôi tên trước, MIME sau */
export function fileKind(name: string, mimeType?: string | null): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType ?? '';
  if (ext === 'pdf' || mime.includes('pdf')) {
    return 'pdf';
  }
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) {
    return 'word';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) {
    return 'excel';
  }
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return 'ppt';
  }
  if (ext === 'zip' || mime.includes('zip')) {
    return 'zip';
  }
  if (ext === 'txt' || mime.includes('text/plain')) {
    return 'txt';
  }
  return 'other';
}
