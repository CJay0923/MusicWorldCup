// 资源 URL 解析中心
//
// 封面主来源 = jsDelivr CDN（独立 GitHub 仓库 CJay0923/mwc-assets）：
//   https://cdn.jsdelivr.net/gh/CJay0923/mwc-assets@main/covers/album_<mid>.jpg
// 该仓库公开托管所有封面图（~3434 张专辑 + 20 张歌手头像），由 jsDelivr 全球 CDN 分发。
//
// 构建期开关（.env / vite 注入）：
//  - VITE_COVER_BASE：jsDelivr 基址（默认指向 mwc-assets@main）。
//                      留空则退回同源 ./covers/（开发模式 / 离线兜底）。
//  - VITE_COVER_REF ：jsDelivr 用的 git ref，默认 main。
//
// 设计要点：
//  - 封面主来源 = jsDelivr CDN（全球节点，国内可达），不依赖七牛/Worker 代理。
//  - onError 兜底链：jsDelivr → 同源（dist 内置副本）→ 隐藏图片。
//  - 同源副本仍随构建打包进 dist/covers/（slimPublic 复制），作为离线/降级兜底。

const REPO = 'CJay0923/mwc-assets';
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

/** 当前生效的自定义封面基址；为空字符串表示走同源 */
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

/** 封面是否同源（相对路径 / 应用主机），分享图可直接读取、无需 CORS 代理 */
export function isSameOriginCover(url) {
  return typeof url === 'string' && !/^https?:\/\//i.test(url);
}

/**
 * 专辑封面主 URL（jsDelivr CDN 优先，同源兜底）。
 * @param {string} albumMid 专辑 ID；空值返回 ''
 * @returns {string} jsDelivr CDN 路径（VITE_COVER_BASE 设定时） / 同源相对路径
 */
export function coverUrl(albumMid) {
  if (!albumMid) return '';
  if (COVER_BASE) return `${COVER_BASE}/covers/album_${albumMid}.jpg`;
  // 同源兜底：dist/covers/ 内置副本（开发模式 / 离线降级）
  return `./covers/album_${albumMid}.jpg`;
}

/** 本地兜底封面（同源相对路径，与 coverUrl 一致） */
export function localCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `./covers/album_${albumMid}.jpg`;
}

/**
 * jsDelivr CDN 封面 URL（独立资产仓库 mwc-assets）。
 * 正常路径：coverUrl() 已直接返回 jsDelivr URL（当 VITE_COVER_BASE 设定时）。
 * 此函数供 onError 降级链显式调用。
 */
export function jsDelivrCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `https://cdn.jsdelivr.net/gh/${REPO}@${COVER_REF}/covers/album_${albumMid}.jpg`;
}

// ── 歌手头像（与封面同策略：同源优先 → jsDelivr 兜底） ──────────────────────

/**
 * 歌手头像主 URL（jsDelivr CDN 优先，同源兜底）。
 * @param {string} singermid 歌手 ID（酷狗 singerid / QQ mid）；空值返回 ''
 * @returns {string} jsDelivr 路径 / 同源相对路径
 */
export function singerPhotoUrl(singermid) {
  if (!singermid) return '';
  if (COVER_BASE) return `${COVER_BASE}/singers/singer_${singermid}.jpg`;
  return `./singers/singer_${singermid}.jpg`;
}

/** jsDelivr 歌手头像（独立资产仓库 mwc-assets） */
export function jsDelivrSingerUrl(singermid) {
  if (!singermid) return '';
  return `https://cdn.jsdelivr.net/gh/${REPO}@${COVER_REF}/singers/singer_${singermid}.jpg`;
}

/**
 * QQ 音乐 CDN 歌手头像（仅作动态歌手的最终兜底）。
 * 预注册歌手头像全部本地化，不会走到这里；
 * 仅运行时搜索的动态歌手才会触发。
 */
export function qqSingerPhotoUrl(singermid) {
  if (!singermid) return '';
  return `https://y.gtimg.cn/music/photo_new/T001R300x300M000${singermid}.jpg`;
}

/**
 * QQ 音乐 CDN 专辑封面（仅作动态歌手的最终兜底）。
 * 预注册歌手的封面全部本地化，不会走到这里；
 * 仅运行时搜索的动态歌手（其 album_mid 不在 public/covers/ 中）才会触发。
 */
export function qqCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`;
}
