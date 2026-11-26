import { message, Modal } from 'antd';
import { api } from '@/api/client';
import { isIos, isStandalone } from '@/lib/pwa';

const TOAST_KEY = 'docs-save-file';

/**
 * App đã cài trên iPhone/iPad: không có thanh trình duyệt nên tải blob dễ kẹt ở màn xem tệp.
 * Dùng bảng Chia sẻ của iOS ("Lưu vào Tệp"). Trả false nếu máy không chia sẻ được tệp.
 */
async function shareOnIos(blob: Blob, filename: string): Promise<boolean> {
  if (!isIos() || !isStandalone() || !navigator.canShare) {
    return false;
  }
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (!navigator.canShare({ files: [file] })) {
    return false;
  }
  const share = () => navigator.share({ files: [file] }).catch(() => undefined);
  try {
    await navigator.share({ files: [file] });
  } catch (err) {
    // Tải lâu quá nên hết "lượt chạm" của người dùng: hỏi lại để có lượt chạm mới
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      Modal.info({
        title: 'Tệp đã tải xong',
        content: filename,
        okText: 'Lưu / chia sẻ',
        onOk: share,
      });
    }
  }
  return true;
}

/** Tải về thành blob để giữ đúng tên tệp: thuộc tính `download` không có tác dụng với link Cloudinary khác domain */
export async function saveFile(file: { url: string; filename: string }): Promise<void> {
  void message.loading({ key: TOAST_KEY, content: 'Đang tải tệp...', duration: 0 });
  try {
    const blob = await api.download(file.url);
    message.destroy(TOAST_KEY);
    if (await shareOnIos(blob, file.filename)) {
      return;
    }
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.filename;
    // Gắn vào trang trước khi bấm: Safari/Firefox bỏ qua click của thẻ chưa nằm trong document
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    void message.error({ key: TOAST_KEY, content: 'Không tải được tệp.' });
  }
}
