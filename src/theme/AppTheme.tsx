import { ConfigProvider, theme, type ThemeConfig } from 'antd';
import type { ReactNode } from 'react';
import { useThemeMode, type ResolvedTheme } from './themeMode';

const shared: ThemeConfig['token'] = {
  colorPrimary: '#0084ff',
  colorInfo: '#0084ff',
  colorSuccess: '#31a24c',
  colorError: '#f02849',
  colorWarning: '#f7b928',
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  fontSize: 14,
  controlHeight: 32,
  fontFamily:
    "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const sharedComponents: ThemeConfig['components'] = {
  Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
  Tabs: { horizontalItemPadding: '10px 0', titleFontSize: 14 },
  Modal: { titleFontSize: 16 },
  Tooltip: { fontSize: 12 },
};

// Giữ khớp với biến --ui-* trong src/styles/ui.css
const themes: Record<ResolvedTheme, ThemeConfig> = {
  light: {
    algorithm: theme.defaultAlgorithm,
    token: {
      ...shared,
      colorText: '#050505',
      colorTextSecondary: '#65676b',
      colorTextTertiary: '#8a8d91',
      colorBorder: '#ced0d4',
      colorBorderSecondary: '#e4e6eb',
      colorBgLayout: '#f0f2f5',
    },
    components: {
      ...sharedComponents,
      Menu: { itemSelectedBg: '#e5f1ff', itemSelectedColor: '#0084ff', itemBorderRadius: 8 },
      Table: {
        headerBg: '#f2f3f5',
        headerColor: '#65676b',
        headerSplitColor: 'transparent',
        rowHoverBg: '#f2f3f5',
        cellPaddingBlock: 16,
      },
    },
  },
  dark: {
    algorithm: theme.darkAlgorithm,
    token: {
      ...shared,
      colorText: '#e4e6eb',
      colorTextSecondary: '#b0b3b8',
      colorTextTertiary: '#8a8d91',
      colorBorder: '#545659',
      colorBorderSecondary: '#3e4042',
      colorBgLayout: '#18191a',
      colorBgContainer: '#242526',
      colorBgElevated: '#2b2c2e',
    },
    components: {
      ...sharedComponents,
      Menu: { itemSelectedBg: '#1d3554', itemSelectedColor: '#6cb4ff', itemBorderRadius: 8 },
      Table: {
        headerBg: '#2b2c2e',
        headerColor: '#b0b3b8',
        headerSplitColor: 'transparent',
        rowHoverBg: '#3a3b3c',
        cellPaddingBlock: 16,
      },
    },
  },
};

export function AppTheme({ children }: { children: ReactNode }) {
  const { resolved } = useThemeMode();
  return <ConfigProvider theme={themes[resolved]}>{children}</ConfigProvider>;
}

// Modal.confirm, message.*, notification.* gọi tĩnh nằm ngoài cây React:
// bọc chúng bằng AppTheme để cũng đổi theo giao diện.
ConfigProvider.config({
  holderRender: (children) => <AppTheme>{children}</AppTheme>,
});
