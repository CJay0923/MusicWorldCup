/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * 瘦身插件：
 *  - buildStart：删除上一版本残留的 dist/covers、dist/singerData（旧构建通过 publicDir 复制过，
 *    本次改用 publicDir:false 不再复制，但 emptyOutDir:false 不会自动清，需手动清）。
 *  - closeBundle：仅把 _redirects 与 favicon.svg 这两个关键静态资源复制到 dist
 *    （SPA 路由与图标必需；封面改走 jsDelivr，歌手数据改走 /api/singer）。
 */
function slimPublic() {
  return {
    name: 'slim-public',
    apply: 'build',
    buildStart() {
      for (const d of ['covers', 'singerData']) {
        const p = path.resolve(root, 'dist', d);
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
          console.log(`[slim-public] 清除残留 dist/${d}`);
        }
      }
    },
    closeBundle() {
      for (const f of ['_redirects', 'favicon.svg']) {
        const src = path.resolve(root, 'public', f);
        const dst = path.resolve(root, 'dist', f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[slim-public] 复制 ${f} -> dist/${f}`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), slimPublic()],
  // 关闭 publicDir 自动复制：covers（113MB，改走 jsDelivr）与 singerData（改走 /api/singer）
  // 不再进包体；仅 _redirects / favicon.svg 由 slimPublic 插件手动复制。
  publicDir: false,
  base: './',
  build: {
    assetsInlineLimit: 4096,
    // 关闭 vite 自动清空 dist：本机 safe-delete 回收站 shim 会拦截 rm 导致 build 失败。
    // 代价：跨次构建会残留旧 hash 资源文件，部署前用 `mv dist dist_bak && npm run build` 清一次即可。
    emptyOutDir: false,
    cssCodeSplit: false,
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
