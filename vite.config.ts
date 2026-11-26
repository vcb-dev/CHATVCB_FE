import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const BE_PROXY = 'http://localhost:3010';
const ELECTRON = process.env.ELECTRON === '1';

export default defineConfig({
  base: ELECTRON ? './' : '/',
  plugins: [
    react(),
    VitePWA({
      // Bản Electron chạy từ file:// nên không có SW/manifest. Dùng `disable` thay vì bỏ plugin:
      // virtual:pwa-register vẫn resolve được (thành hàm rỗng) nên src/lib/pwa.ts không vỡ build Electron.
      disable: ELECTRON,
      // Tự viết SW (src/sw.ts) vì cần xử lý push + notificationclick, không chỉ cache
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Có bản mới thì hỏi người dùng (đang gõ tin / đang gọi), không tự tải lại
      registerType: 'prompt',
      injectRegister: false,
      // Icon đã nằm trong globPatterns (png) bên dưới; để plugin thêm nữa thì danh sách precache bị trùng
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'CHATVCB',
        short_name: 'CHATVCB',
        description: 'Chat nội bộ CHATVCB',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f0f2f5',
        theme_color: '#ffffff',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // Chỉ vỏ app: JS/CSS/HTML đã build, font, icon. /api và socket không bao giờ vào cache.
        globPatterns: ['**/*.{js,css,html,woff2,png,ico}'],
        // Logo gốc 1024px không trang nào dùng
        globIgnores: ['**/logo-chatvcb.png'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: BE_PROXY,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: BE_PROXY,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: BE_PROXY,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: BE_PROXY,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('socket.io')) {
            return 'socket';
          }
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
            return 'antd';
          }
        },
      },
    },
  },
});
