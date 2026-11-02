import { message } from 'antd';
import { api } from '@/api/client';

const TOAST_KEY = 'gallery-save';

/** Tải về thành blob vì thuộc tính `download` không có tác dụng với link khác domain như Cloudinary */
export async function savePhoto(photo: { url: string; filename: string }): Promise<void> {
  void message.loading({ key: TOAST_KEY, content: 'Đang tải ảnh...', duration: 0 });
  try {
    const blob = await api.download(photo.url);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = photo.filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    message.destroy(TOAST_KEY);
  } catch {
    void message.error({ key: TOAST_KEY, content: 'Không lưu được ảnh.' });
  }
}
