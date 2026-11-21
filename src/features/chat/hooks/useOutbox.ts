import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { failedRoomIds, subscribe } from '../utils/outbox';

/** Phòng này còn tin gửi lỗi (cột trái hiện dấu đỏ). */
export function useRoomSendFailed(roomId: string): boolean {
  return useSyncExternalStore(subscribe, () => failedRoomIds().has(roomId));
}

const subscribeOnline = (listener: () => void) => onlineManager.subscribe(listener);
const isOnline = () => onlineManager.isOnline();

/** Có mạng theo TanStack: chính cờ này quyết định mutation gửi tin chạy hay tạm dừng chờ mạng. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnline);
}
