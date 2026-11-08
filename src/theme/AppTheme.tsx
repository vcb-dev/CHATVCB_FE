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
          colorSuccess: '#31a24c',
          colorError: '#f02849',
          colorWarning: '#f7b928',
          colorText: '#050505',
          colorTextSecondary: '#65676b',
          colorTextTertiary: '#8a8d91',
          colorBorder: '#ced0d4',
          colorBorderSecondary: '#e4e6eb',
          colorBgLayout: '#f0f2f5',
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 4,
          fontSize: 14,
          controlHeight: 32,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
          Menu: { itemSelectedBg: '#e5f1ff', itemSelectedColor: '#0084ff', itemBorderRadius: 8 },
          Tabs: { horizontalItemPadding: '10px 0', titleFontSize: 14 },
          Modal: { titleFontSize: 16 },
          Tooltip: { fontSize: 12 },
          Table: {
            headerBg: '#f2f3f5',
            headerColor: '#65676b',
            headerSplitColor: 'transparent',
            rowHoverBg: '#f2f3f5',
            cellPaddingBlock: 16,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
