import type { MailMessage } from '@/types';

/** Nội dung form soạn thư. `replyUid` có khi đang trả lời một thư trong hộp. */
export type ComposeDraft = {
  to: string;
  cc: string;
  subject: string;
  text: string;
  replyUid?: string;
};

// Trích dẫn thư gốc dài quá thì cắt, tránh vượt giới hạn 200.000 ký tự của BE
const QUOTE_LIMIT = 20_000;

export const EMPTY_DRAFT: ComposeDraft = { to: '', cc: '', subject: '', text: '' };

/** "Re: " chỉ thêm một lần, kể cả khi thư gốc đã là "RE:" hay "Re:". */
export function replySubject(subject: string) {
  const clean = subject.trim();
  return /^re\s*:/i.test(clean) ? clean : `Re: ${clean}`;
}

export function quoteText(text: string) {
  const body = text.replace(/\r\n/g, '\n').trimEnd();
  const cut = body.length > QUOTE_LIMIT ? `${body.slice(0, QUOTE_LIMIT)}\n…` : body;
  return cut
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

/** Thư chỉ có HTML: lấy chữ, giữ xuống dòng ở <br> và cuối khối. Chạy trong trình duyệt (DOMParser). */
export function htmlToPlain(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style,script,head').forEach((node) => node.remove());
  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6,blockquote').forEach((node) => node.append('\n'));
  return (doc.body.textContent ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Thư trả lời: gửi lại người gửi, giữ tiêu đề có "Re:", trích dẫn nội dung gốc bên dưới.
 * `plainText` là nội dung gốc dạng chữ (thư chỉ có HTML thì bên gọi tự chuyển).
 */
export function buildReplyDraft(original: MailMessage, plainText: string, when: string): ComposeDraft {
  const head = when ? `Vào ${when}, ${original.from} đã viết:` : `${original.from} đã viết:`;
  const quoted = plainText.trim() ? `\n\n${head}\n${quoteText(plainText)}` : '';
  return {
    to: original.from,
    cc: '',
    subject: replySubject(original.subject),
    text: quoted,
    replyUid: original.uid,
  };
}
