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

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
