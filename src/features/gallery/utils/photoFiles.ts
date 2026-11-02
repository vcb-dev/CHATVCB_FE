export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_PER_SEND = 20;
export const PHOTO_SEND_CONCURRENCY = 3;

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function photoFileError(file: { size: number; type: string }): string | null {
  if (!PHOTO_TYPES.has(file.type)) {
    return 'Chỉ nhận ảnh JPG, PNG, GIF, WebP.';
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return 'Ảnh tối đa 10 MB.';
  }
  return null;
}
