import { message } from 'antd';
import { api } from '@/api/client';
import { dropTab, reserveTab, sendTab } from './googleTab';

/**
 * Mở tài liệu trên Google: BE cấp quyền cho email Google của người mở rồi trả link.
 * Chưa kết nối Google thì chuyển sang luồng kết nối (intent=open), xong BE chuyển thẳng tới tài liệu.
 * Dùng chung cho trang Docs và thẻ tài liệu trong chat.
 */
export async function openDocOnGoogle(docId: string, googleConnected: boolean | undefined) {
  // Mở tab ngay trong lúc bấm, Safari chặn window.open sau await
  const tab = googleConnected === false ? null : reserveTab();
  try {
    const access = await api.docGoogleAccess(docId);
    sendTab(tab, access.url);
    if (!access.granted) {
      message.warning(
        'Chưa cấp được quyền trên Google. Nếu Google báo cần quyền, bấm "Yêu cầu quyền truy cập" hoặc nhờ quản trị viên kiểm tra Drive công ty.',
      );
    }
  } catch (err) {
    dropTab(tab);
    const text = err instanceof Error ? err.message : '';
    if (text.includes('GOOGLE_CONNECT')) {
      try {
        const next = await api.googleSheetsStart({ intent: 'open', docId });
        window.location.assign(next.url);
      } catch (connectErr) {
        message.error(connectErr instanceof Error ? connectErr.message : 'Không mở được Google.');
      }
      return;
    }
    message.error(text || 'Không mở được tài liệu.');
  }
}
