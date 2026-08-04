/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    assetsInlineLimit: 4096,
    // 关闭 vite 自动清空 dist：本机 safe-delete 回收站 shim 会拦截 rm 导致 build 失败。
    // 代价：跨次构建会残留旧 hash 资源文件，部署前用 `mv dist dist_bak && npm run build` 清一次即可。
    emptyOutDir: false,
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
