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
 *  - buildStart：删除上一版本残留的 dist/covers、dist/singers、dist/singerData（旧构建通过 publicDir 复制过，
 *    本次改用 publicDir:false 不再复制，但 emptyOutDir:false 不会自动清，需手动清）。
 *  - closeBundle：
 *      · 复制 _redirects 与 favicon.svg（SPA 路由与图标必需）；
 *      · 复制 public/covers -> dist/covers：封面同源托管（不走外部 CDN）；
 *      · 复制 public/singers -> dist/singers：歌手头像同源托管（不走 QQ CDN）；
 *      · singerData 仍不进包体（改走 /api/singer D1 接口）。
 */
function slimPublic() {
  return {
    name: 'slim-public',
    apply: 'build',
    buildStart() {
      for (const d of ['covers', 'singers', 'singerData', 'assets', 'fonts']) {
        const p = path.resolve(root, 'dist', d);
        if (fs.existsSync(p)) {
          try {
            fs.rmSync(p, { recursive: true, force: true });
            console.log(`[slim-public] 清除残留 dist/${d}`);
          } catch (e) {
            console.warn(`[slim-public] 无法清除 dist/${d}: ${e.message}`);
          }
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
      // 歌手头像：同源托管，随站发布（不走 QQ 音乐 CDN）
      const singersSrc = path.resolve(root, 'public', 'singers');
      const singersDst = path.resolve(root, 'dist', 'singers');
      if (fs.existsSync(singersSrc)) {
        fs.cpSync(singersSrc, singersDst, { recursive: true });
        const n = fs.readdirSync(singersDst).filter((f) => f.endsWith('.jpg')).length;
        console.log(`[slim-public] 复制 singers -> dist/singers (${n} 张)`);
      }
      // 自托管 web 字体（Permanent Marker 等）：同源托管，不走 Google Fonts CDN
      const fontsSrc = path.resolve(root, 'public', 'fonts');
      const fontsDst = path.resolve(root, 'dist', 'fonts');
      if (fs.existsSync(fontsSrc)) {
        fs.cpSync(fontsSrc, fontsDst, { recursive: true });
        const n = fs.readdirSync(fontsDst).filter((f) => /\.(woff2?|ttf|otf)$/.test(f)).length;
        console.log(`[slim-public] 复制 fonts -> dist/fonts (${n} 个)`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), slimPublic()],
  // 开发时启用 publicDir，让 dev server 能 serve public/covers 和 public/singers；
  // 生产构建时关闭 publicDir，避免 singerData 被复制进包体，
  // covers + singers 改由 slimPublic 插件手动复制进 dist（同源托管，不走外部 CDN）。
  publicDir: process.env.NODE_ENV === 'production' ? false : 'public',
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
