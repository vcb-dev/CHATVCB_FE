import type { DocKind } from '@/types';
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
  if (template === 'meeting') {
    return 'Biên bản họp';
  }
  if (template === 'weekly') {
    return 'Báo cáo tuần';
  }
  return 'Tài liệu không tiêu đề';
}

export function draftContent(kind: DocKind, template?: string, content?: string) {
  if (content) {
    return content;
  }
  if (kind === 'sheet') {
    return JSON.stringify(EMPTY_SHEET);
  }
  if (template === 'meeting') {
    return '<h2>Mục tiêu</h2><p></p><h2>Thành phần</h2><ul><li></li></ul><h2>Nội dung</h2><p></p><h2>Việc cần làm</h2><ul><li></li></ul>';
  }
  if (template === 'weekly') {
    return '<h2>Đã làm</h2><ul><li></li></ul><h2>Đang làm</h2><ul><li></li></ul><h2>Vướng mắc</h2><p></p><h2>Kế hoạch tuần sau</h2><ul><li></li></ul>';
  }
  return '';
}
