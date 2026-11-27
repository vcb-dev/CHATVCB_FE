export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/gif,image/webp';

// Khớp R2_IMAGE_MAX_BYTES ở BE: ảnh chat và Thư viện ảnh lưu trên R2
export const IMAGE_MAX_BYTES = 50 * 1024 * 1024;

// Khớp IMAGE_UPLOAD_MAX_BYTES ở BE: ảnh Bản tin vẫn lưu Cloudinary, gói hiện tại chỉ nhận tới 10 MB
export const NEWS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(ACCEPT_IMAGES.split(','));

export function imageFileError(
  file: { size: number; type: string },
  maxBytes = IMAGE_MAX_BYTES,
): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Chỉ nhận ảnh JPG, PNG, GIF, WebP.';
  }
  if (file.size > maxBytes) {
    return `Ảnh tối đa ${maxBytes / 1024 / 1024} MB.`;
  }
  return null;
}

export async function compressImage(file: File, max = 400) {
  if (file.type === 'image/gif' || file.size < 80_000) {
    return file;
  }
  return new Promise<File>((resolve) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.8,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}
