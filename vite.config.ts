import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const BE_PROXY = 'http://localhost:3010';

export default defineConfig(() => {
  const beProxy = BE_PROXY;

  const proxy = {
    '/api': {
      target: beProxy,
      changeOrigin: true,
      secure: false,
    },
    '/socket.io': {
      target: beProxy,
      changeOrigin: true,
      ws: true,
      secure: false,
    },
  };

  console.log(`[vite] same-site proxy /api /socket.io → ${beProxy}`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    preview: {
      port: 5173,
      proxy,
    },
  };
});
