import { useEffect } from 'react';
import { requestNotifyPermission, restoreTitle } from '@/lib/notify';

export function useChatNotifications() {
  useEffect(() => {
    void requestNotifyPermission();
    const onVisible = () => {
      if (!document.hidden) {
        restoreTitle();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);
}
