import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BE_PROXY = 'http://localhost:3010';

export default defineConfig({
  base: process.env.ELECTRON === '1' ? './' : '/',
  plugins: [react()],
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
