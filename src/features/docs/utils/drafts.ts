import type { DocKind, DocTemplate } from '@/types';
import { TEMPLATE_CONTENT } from './templates';
import { EMPTY_SHEET } from './workbook';

export function kindLabel(kind?: DocKind) {
  const labels: Record<DocKind, string> = {
    doc: 'Word',
    sheet: 'Google Sheet',
    slides: 'Trang chiếu',
    form: 'Biểu mẫu',
    mind: 'MindNotes',
    folder: 'Thư mục',
    board: 'Bảng',
    flow: 'Lưu đồ',
  };
  return labels[kind || 'doc'];
}

export function draftTitle(kind: DocKind, template?: string, title?: string) {
  if (title?.trim()) {
    return title.trim();
  }
  if (kind === 'sheet') {
    return 'Bảng tính không tiêu đề';
  }
  return TEMPLATE_CONTENT[template as DocTemplate]?.title ?? 'Tài liệu không tiêu đề';
}

export function draftContent(kind: DocKind, template?: string, content?: string) {
  if (content) {
    return content;
  }
  if (kind === 'sheet') {
    return JSON.stringify(EMPTY_SHEET);
  }
  return TEMPLATE_CONTENT[template as DocTemplate]?.content ?? '';
}
