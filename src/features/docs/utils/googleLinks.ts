// Cùng mẫu với googleIdFromUrl ở BE (src/docs/doc-access.ts)
const GOOGLE_LINK = /^https?:\/\/docs\.google\.com\/(?:document|spreadsheets)\/d\/([A-Za-z0-9_-]+)/;

/** Id tệp trong link Google Doc/Sheet (bỏ qua /edit, ?usp=, #gid=); không phải link Doc/Sheet thì null */
export function googleDocIdFromUrl(url: string): string | null {
  return GOOGLE_LINK.exec(url.trim())?.[1] ?? null;
}

/** Link chuẩn của tài liệu trên Google, dựng từ id: luôn khớp mẫu ở trên nên chắc chắn thành thẻ trong chat */
export function googleDocUrl(kind: string, googleId: string): string {
  return `https://docs.google.com/${kind === 'sheet' ? 'spreadsheets' : 'document'}/d/${googleId}/edit`;
}
