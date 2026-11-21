import { useEffect, useRef } from 'react';
import { requestNotifyPermission, restoreTitle } from '@/lib/notify';
import { resetTab, setTabUnread } from '@/lib/tabBadge';

export function useChatNotifications(options: {
  onOpenRoom: (roomId: string) => void;
  /** Số cuộc trò chuyện chưa đọc hiện trên tab trình duyệt / Dock */
  unread: number;
}) {
  const onOpenRef = useRef(options.onOpenRoom);
  onOpenRef.current = options.onOpenRoom;

  useEffect(() => {
    void requestNotifyPermission();
    const onVisible = () => {
      if (!document.hidden) {
        restoreTitle();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const off = window.chatvcb?.onOpenRoom?.((id) => onOpenRef.current(id));
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      off?.();
      // Đăng xuất thì không để lại số chưa đọc của tài khoản cũ trên tab
      resetTab();
    };
  }, []);

  useEffect(() => {
    setTabUnread(options.unread);
  }, [options.unread]);
}
