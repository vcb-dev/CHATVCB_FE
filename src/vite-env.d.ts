/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_WEB_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  chatvcb?: {
    isElectron?: boolean;
    notify?: (payload: {
      title: string;
      body: string;
      subtitle?: string;
      mentioned?: boolean;
      roomId?: string;
    }) => void;
    isWindowFocused?: () => boolean;
    /** Người dùng rời máy (khoá màn hình, máy ngủ, rảnh 5 phút) dù cửa sổ vẫn focus; app cài từ bản cũ không có hàm này */
    isAway?: () => boolean;
    onAwayChange?: (handler: (away: boolean) => void) => () => void;
    onOpenRoom?: (handler: (roomId: string) => void) => () => void;
    /** Số chưa đọc trên icon Dock; app cài từ bản cũ không có hàm này */
    setBadge?: (count: number) => void;
    /** Bật/tắt nảy icon Dock / nháy thanh tác vụ khi có cuộc gọi đến; app cài từ bản cũ không có hàm này */
    callAlert?: (on: boolean) => void;
  };
}
