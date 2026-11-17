import type { DocTemplate } from '@/types';

export type TemplateGroup = 'all' | 'meet' | 'plan' | 'sheet';
export type TemplateCard = {
  key: string;
  kind: 'doc' | 'sheet';
  template?: DocTemplate;
  title: string;
  hint: string;
  group: Exclude<TemplateGroup, 'all'> | 'basic';
};

export const TEMPLATE_GROUPS: { key: TemplateGroup; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'meet', label: 'Họp & báo cáo' },
  { key: 'plan', label: 'Kế hoạch' },
  { key: 'sheet', label: 'Bảng tính' },
];

/** Trung tâm mẫu. Tiêu đề và nội dung mẫu phải khớp BE: doc-kinds.ts (meeting, weekly) và doc-templates.ts (còn lại) */
export const TEMPLATE_CARDS: TemplateCard[] = [
  { key: 'blank', kind: 'doc', template: 'blank', title: 'Tài liệu trống', hint: 'Trang trắng để viết', group: 'basic' },
  { key: 'meeting', kind: 'doc', template: 'meeting', title: 'Biên bản họp', hint: 'Mục tiêu, thành phần, việc cần làm', group: 'meet' },
  { key: 'weekly', kind: 'doc', template: 'weekly', title: 'Báo cáo tuần', hint: 'Đã làm, đang làm, kế hoạch', group: 'meet' },
  { key: 'oneonone', kind: 'doc', template: 'oneonone', title: 'Ghi chú 1-1', hint: 'Cập nhật, khó khăn, phản hồi', group: 'meet' },
  { key: 'plan', kind: 'doc', template: 'plan', title: 'Kế hoạch dự án', hint: 'Mục tiêu, phạm vi, mốc thời gian, rủi ro', group: 'plan' },
  { key: 'proposal', kind: 'doc', template: 'proposal', title: 'Đề xuất', hint: 'Vấn đề, giải pháp, chi phí', group: 'plan' },
  { key: 'handover', kind: 'doc', template: 'handover', title: 'Bàn giao công việc', hint: 'Việc đang làm, tài liệu, đầu mối', group: 'plan' },
  { key: 'sheet', kind: 'sheet', title: 'Bảng tính trống', hint: 'Google Sheet mới', group: 'sheet' },
];

/** Nội dung mẫu cho bản soạn trong ChatVCB (khi Drive công ty lỗi) */
export const TEMPLATE_CONTENT: Partial<Record<DocTemplate, { title: string; content: string }>> = {
  meeting: {
    title: 'Biên bản họp',
    content:
      '<h2>Mục tiêu</h2><p></p><h2>Thành phần</h2><ul><li></li></ul><h2>Nội dung</h2><p></p><h2>Việc cần làm</h2><ul><li></li></ul>',
  },
  weekly: {
    title: 'Báo cáo tuần',
    content:
      '<h2>Đã làm</h2><ul><li></li></ul><h2>Đang làm</h2><ul><li></li></ul><h2>Vướng mắc</h2><p></p><h2>Kế hoạch tuần sau</h2><ul><li></li></ul>',
  },
  plan: {
    title: 'Kế hoạch dự án',
    content:
      '<h2>Mục tiêu</h2><p></p><h2>Phạm vi</h2><ul><li></li></ul><h2>Mốc thời gian</h2><ul><li></li></ul><h2>Nhân sự</h2><ul><li></li></ul><h2>Rủi ro</h2><ul><li></li></ul>',
  },
  proposal: {
    title: 'Đề xuất',
    content:
      '<h2>Vấn đề</h2><p></p><h2>Giải pháp đề xuất</h2><p></p><h2>Chi phí và nguồn lực</h2><p></p><h2>Kết quả mong đợi</h2><ul><li></li></ul>',
  },
  oneonone: {
    title: 'Ghi chú 1-1',
    content:
      '<h2>Cập nhật</h2><ul><li></li></ul><h2>Khó khăn</h2><ul><li></li></ul><h2>Phản hồi</h2><p></p><h2>Việc cần làm</h2><ul><li></li></ul>',
  },
  handover: {
    title: 'Bàn giao công việc',
    content:
      '<h2>Công việc đang làm</h2><ul><li></li></ul><h2>Tài liệu và tài khoản liên quan</h2><ul><li></li></ul><h2>Đầu mối liên hệ</h2><ul><li></li></ul><h2>Lưu ý</h2><p></p>',
  },
};
