import { api } from '@/api/client';

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') {
    return blob;
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => {
      if (png) {
        resolve(png);
      } else {
        reject(new Error('Không chuyển được ảnh sang PNG.'));
      }
    }, 'image/png');
  });
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export async function copyImage(src: string) {
  const png = api.download(src).then(toPngBlob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
