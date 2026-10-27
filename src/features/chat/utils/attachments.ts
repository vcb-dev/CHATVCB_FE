import type { PendingFile } from '@/types';

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
