import { useEffect, useRef, useState } from 'react';
import { restoreTitle } from '@/lib/notify';
import { syncPushSubscription } from '@/lib/push';
import { OPEN_ROOM_MESSAGE } from '@/lib/pushPayload';
import { resetTab, setTabUnread } from '@/lib/tabBadge';

/** Bấm thông báo lúc app đã đóng: SW mở `/?room=<id>`. Đọc rồi xóa khỏi thanh địa chỉ để F5 không mở lại. */
function takeRoomParam() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room') || '';
  if (roomId) {
    params.delete('room');
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
  }
  return roomId;
}

export function useChatNotifications(options: {
  onOpenRoom: (roomId: string) => void;
  /** Số cuộc trò chuyện chưa đọc hiện trên tab trình duyệt / Dock */
  unread: number;
  /** Danh sách phòng đã tải: phòng mở từ `?room=` phải có trong danh sách mới mở được */
  roomsReady: boolean;
}) {
  const onOpenRef = useRef(options.onOpenRoom);
  onOpenRef.current = options.onOpenRoom;
  const [pendingRoomId, setPendingRoomId] = useState(takeRoomParam);

  useEffect(() => {
    // Không tự xin quyền ở đây: iOS chỉ cho xin khi người dùng chạm (công tắc trong menu / NotifyPrompt).
    // Đã có quyền thì đăng ký (hoặc gia hạn) Web Push cho máy này.
    void syncPushSubscription();
    const onVisible = () => {
      if (!document.hidden) {
        restoreTitle();
      }
    };
    // Bấm thông báo (push hoặc thông báo qua SW) lúc app đang mở
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; roomId?: string } | null;
      if (data?.type === OPEN_ROOM_MESSAGE && data.roomId) {
        onOpenRef.current(data.roomId);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    const off = window.chatvcb?.onOpenRoom?.((id) => onOpenRef.current(id));
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
      off?.();
      // Đăng xuất thì không để lại số chưa đọc của tài khoản cũ trên tab
      resetTab();
    };
  }, []);

  useEffect(() => {
    if (pendingRoomId && options.roomsReady) {
      setPendingRoomId('');
      onOpenRef.current(pendingRoomId);
    }
  }, [pendingRoomId, options.roomsReady]);

  useEffect(() => {
    setTabUnread(options.unread);
  }, [options.unread]);
}
