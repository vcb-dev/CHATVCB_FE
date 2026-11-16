import { message } from 'antd';
import { api } from '@/api/client';

const TOAST_KEY = 'docs-save-file';

/** Tải về thành blob để giữ đúng tên tệp: thuộc tính `download` không có tác dụng với link Cloudinary khác domain */
export async function saveFile(file: { url: string; filename: string }): Promise<void> {
  void message.loading({ key: TOAST_KEY, content: 'Đang tải tệp...', duration: 0 });
  try {
    const blob = await api.download(file.url);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    message.destroy(TOAST_KEY);
  } catch {
    void message.error({ key: TOAST_KEY, content: 'Không tải được tệp.' });
  }
}
