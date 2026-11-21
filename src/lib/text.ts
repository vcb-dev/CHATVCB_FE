/** Bỏ dấu tiếng Việt (Đ -> d) và viết thường để tìm kiếm không phân biệt dấu. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}
