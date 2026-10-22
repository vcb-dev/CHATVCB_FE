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

const AVATAR_COLORS = ['#0084ff', '#00a400', '#f02849', '#d696bb', '#ff7a00', '#7b61ff', '#00b8d9'];

export function avatarColor(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
