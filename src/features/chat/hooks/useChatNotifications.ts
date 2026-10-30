import { useEffect, useRef } from 'react';
import { requestNotifyPermission, restoreTitle } from '@/lib/notify';

export function useChatNotifications(options: { onOpenRoom: (roomId: string) => void }) {
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
    };
  }, []);
}
