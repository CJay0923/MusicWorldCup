// 资源 URL 解析中心
//
// 封面默认走 jsDelivr GitHub CDN（免卡、免费、CDN 加速）：
//   https://cdn.jsdelivr.net/gh/<repo>@<ref>/public/covers/album_<mid>.jpg
// 仓库的 public/covers/*.jpg 已随代码提交，jsDelivr 直接 serve，无需上传、无需绑卡。
//
// 构建期开关（.env / vite 注入）：
//  - VITE_COVER_BASE：设为 R2 / 自定义对象存储基址时，优先走它（覆盖 jsDelivr）。
//                      例如 VITE_COVER_BASE=https://<acct>.r2.cloudflarestorage.com/covers
//  - VITE_COVER_REF ：jsDelivr 的 git ref，默认 main；生产建议打 release tag 锁定缓存。
//
// 设计要点：
//  - 未配置 VITE_COVER_BASE 时默认 jsDelivr，dev / 未迁移环境零改动照常工作。
//  - 各组件已有 onError 链路（pic → songPic → y.gtimg.cn CDN），jsDelivr 不可用时自动回退 QQ CDN。
//  - localCoverUrl() 提供 dist 自带封面的最后兜底（构建未排除 public/covers 时有效）。

const REPO = 'CJay0923/MusicWorldCup';
const DEFAULT_REF = 'main';

const RAW_BASE =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_COVER_BASE
    ? String(import.meta.env.VITE_COVER_BASE)
    : '';

// 去掉尾部斜杠，避免 // 重复
const COVER_BASE = RAW_BASE.replace(/\/+$/, '');

const COVER_REF =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_COVER_REF
    ? String(import.meta.env.VITE_COVER_REF)
    : DEFAULT_REF;

/** 当前生效的自定义封面基址；为空字符串表示走 jsDelivr */
export function getCoverBase() {
  return COVER_BASE;
}

/** 封面是否来自自定义基址（R2 等），用于分享图 CORS 代理判断 */
export function isR2Cover(url) {
  return !!COVER_BASE && typeof url === 'string' && url.startsWith(COVER_BASE);
}

/** 封面是否来自 jsDelivr（自带 CORS，分享图可直接 crossOrigin 加载） */
export function isJsDelivrCover(url) {
  return typeof url === 'string' && url.includes('cdn.jsdelivr.net');
}

/**
 * 专辑封面 URL。
 * @param {string} albumMid 专辑 ID；空值返回 ''
 * @returns {string} 自定义基址路径 / jsDelivr CDN 地址
 */
export function coverUrl(albumMid) {
  if (!albumMid) return '';
  if (COVER_BASE) return `${COVER_BASE}/covers/album_${albumMid}.jpg`;
  return `https://cdn.jsdelivr.net/gh/${REPO}@${COVER_REF}/public/covers/album_${albumMid}.jpg`;
}

/** 本地兜底封面（dist 自带，路径相对站点根） */
export function localCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `./covers/album_${albumMid}.jpg`;
}
