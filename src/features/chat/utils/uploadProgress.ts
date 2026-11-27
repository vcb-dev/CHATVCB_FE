import { useSyncExternalStore } from 'react';

// % tải lên của tệp chat đang gửi, theo clientId của tin tạm. Chỉ thẻ tệp của tin đó nghe,
// nên tiến trình đổi liên tục không làm vẽ lại cả danh sách tin
const progress = new Map<string, number>();
const listeners = new Set<() => void>();

/** null: xoá khi gửi xong / lỗi */
export function setUploadProgress(key: string, percent: number | null) {
  if (percent === null ? !progress.has(key) : progress.get(key) === percent) {
    return;
  }
  if (percent === null) {
    progress.delete(key);
  } else {
    progress.set(key, percent);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** % đang tải của tin `key`; undefined khi không có tệp đang tải (đường cũ qua BE không đo được %) */
export function useUploadProgress(key?: string | null): number | undefined {
  return useSyncExternalStore(subscribe, () => (key ? progress.get(key) : undefined));
}
