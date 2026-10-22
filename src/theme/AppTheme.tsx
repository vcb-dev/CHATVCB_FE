import { ConfigProvider, theme } from 'antd';
import type { ReactNode } from 'react';

export function AppTheme({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0084ff',
          colorInfo: '#0084ff',
          borderRadius: 12,
          fontFamily: 'system-ui, sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
