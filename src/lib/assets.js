// 资源 URL 解析中心
//
// 封面默认随站部署在 ./covers/album_{albumMid}.jpg（构建后被拷贝到 /covers/...）。
// 迁移到 R2 后，构建期通过 VITE_COVER_BASE 注入 R2 公共地址，
// 所有封面一律改为走 R2 的全局 CDN —— 部署体积从 126MB 降到个位数 MB。
//
// 设计要点:
//  - 未配置 VITE_COVER_BASE 时回退到本地相对路径，dev / 未迁移环境零改动照常工作。
//  - coverUrl 只负责"拼路径"，是否命中 CDN 由 R2 桶的公开访问/CORS 决定（见迁移脚本注释）。

const RAW_BASE =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_COVER_BASE
    ? String(import.meta.env.VITE_COVER_BASE)
    : '';

// 去掉尾部斜杠，避免 // 重复
const COVER_BASE = RAW_BASE.replace(/\/+$/, '');

/** 当前生效的封面基址；为空字符串表示仍使用本地静态封面 */
export function getCoverBase() {
  return COVER_BASE;
}

/** 封面是否来自 R2（用于分享图 CORS 代理判断等） */
export function isR2Cover(url) {
  return !!COVER_BASE && typeof url === 'string' && url.startsWith(COVER_BASE);
}

/**
 * 专辑封面 URL。
 * @param {string} albumMid 专辑 ID；空值返回 ''
 * @returns {string} R2 绝对地址或本地相对路径
 */
export function coverUrl(albumMid) {
  if (!albumMid) return '';
  if (COVER_BASE) return `${COVER_BASE}/covers/album_${albumMid}.jpg`;
  return `./covers/album_${albumMid}.jpg`;
}
