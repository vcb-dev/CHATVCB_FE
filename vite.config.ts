import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BE_PROXY = 'http://localhost:3010';

export default defineConfig({
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
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
});
