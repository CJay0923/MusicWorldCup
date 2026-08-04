/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * 瘦身 / 资源搬运插件：
 *  - buildStart：删除上一版本残留的 dist/covers、dist/singerData（旧构建通过 publicDir 复制过，
 *    本次改用 publicDir:false 不再复制，但 emptyOutDir:false 不会自动清，需手动清）。
 *  - closeBundle：
 *      · 复制 _redirects 与 favicon.svg（SPA 路由与图标必需）；
 *      · 复制 public/covers -> dist/covers：封面改为同源托管（不走外部 CDN，
 *        避免 jsDelivr→raw.githubusercontent.com 在部分区域被墙/限速）；
 *      · singerData 仍不进包体（改走 /api/singer D1 接口）。
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
      // 关键静态资源（SPA 路由 + 图标）
      for (const f of ['_redirects', 'favicon.svg']) {
        const src = path.resolve(root, 'public', f);
        const dst = path.resolve(root, 'dist', f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[slim-public] 复制 ${f} -> dist/${f}`);
        }
      }
      // 封面：同源托管，随站发布（不走外部 CDN）
      const coversSrc = path.resolve(root, 'public', 'covers');
      const coversDst = path.resolve(root, 'dist', 'covers');
      if (fs.existsSync(coversSrc)) {
        fs.cpSync(coversSrc, coversDst, { recursive: true });
        const n = fs.readdirSync(coversDst).filter((f) => f.endsWith('.jpg')).length;
        console.log(`[slim-public] 复制 covers -> dist/covers (${n} 张)`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), slimPublic()],
  // 关闭 publicDir 自动复制：singerData（改走 /api/singer）不进包体；
  // covers 由 slimPublic 插件手动复制进 dist/covers（同源托管，不走外部 CDN）。
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
