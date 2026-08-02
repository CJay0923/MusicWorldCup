/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 歌手数据 JSON 拆分为独立 chunk，按需加载
        manualChunks(id) {
          if (id.includes('/singerData/') && id.endsWith('.json')) {
            const match = id.match(/singerData\/([^/]+)\.json/);
            if (match) return `singer-${match[1]}`;
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
