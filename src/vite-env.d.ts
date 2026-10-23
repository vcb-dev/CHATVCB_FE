/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
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
    onOpenRoom?: (handler: (roomId: string) => void) => () => void;
  };
}
