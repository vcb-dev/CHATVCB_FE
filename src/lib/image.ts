export const ACCEPT_IMAGES = 'image/jpeg,image/png,image/gif,image/webp';

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(ACCEPT_IMAGES.split(','));

export function imageFileError(file: { size: number; type: string }): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Chỉ nhận ảnh JPG, PNG, GIF, WebP.';
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'Ảnh tối đa 10 MB.';
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
