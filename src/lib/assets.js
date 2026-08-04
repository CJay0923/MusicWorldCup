// 资源 URL 解析中心
//
// 封面优先走「同源」（应用自身托管）：
//   ./covers/album_<mid>.jpg
// 仓库的 public/covers/*.jpg 随构建复制进 dist/covers/，由部署平台（Vercel / Cloudflare Pages）
// 直接同源 serve。不走任何外部 CDN，避免 jsDelivr→raw.githubusercontent.com 在部分区域被墙/限速。
//
// 构建期开关（.env / vite 注入）：
//  - VITE_COVER_BASE：设为 R2 / 自定义对象存储基址时，优先走它（覆盖同源）。
//                      例如 VITE_COVER_BASE=https://<acct>.r2.cloudflarestorage.com/covers
//  - VITE_COVER_REF ：jsDelivr 兜底用的 git ref，默认 v1.0.0。
//
// 设计要点：
//  - 封面主来源 = 同源（应用主机），不依赖任何外部音乐 API（QQ/酷狗）或外部 CDN。
//  - onError 兜底链：同源 → jsDelivr → 隐藏图片显示占位背景。
//  - 全部 927 个被引用的 album_mid 均有对应文件在 public/covers/（覆盖率 100%），
//    并由 slimPublic 插件复制进 dist/covers/ 随站发布。
//  - localCoverUrl() 与 coverUrl() 同源，提供 dist 自带封面的兜底。

const REPO = 'CJay0923/MusicWorldCup';
const DEFAULT_REF = 'v1.0.0';

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
 * 专辑封面主 URL（同源优先）。
 * @param {string} albumMid 专辑 ID；空值返回 ''
 * @returns {string} 自定义基址路径（R2） / 同源相对路径
 */
export function coverUrl(albumMid) {
  if (!albumMid) return '';
  if (COVER_BASE) return `${COVER_BASE}/covers/album_${albumMid}.jpg`;
  // 同源：由部署平台直接 serve dist/covers/，免外部 CDN（避免国内 raw.githubusercontent 被墙）
  return `./covers/album_${albumMid}.jpg`;
}

/** 本地兜底封面（同源相对路径，与 coverUrl 一致） */
export function localCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `./covers/album_${albumMid}.jpg`;
}

/**
 * jsDelivr GitHub CDN 兜底（同源封面失败时的降级方案）。
 * 注意：jsDelivr 对 tag/branch 引用会 301 到 raw.githubusercontent.com，后者在部分区域不可达；
 * 因此仅作为同源主来源的兜底，正常情况下不应触发。
 */
export function jsDelivrCoverUrl(albumMid) {
  if (!albumMid) return '';
  return `https://cdn.jsdelivr.net/gh/${REPO}@${COVER_REF}/public/covers/album_${albumMid}.jpg`;
}

// ── 歌手头像（与封面同策略：同源优先 → jsDelivr 兜底） ──────────────────────

/**
 * 歌手头像主 URL（同源优先）。
 * @param {string} singermid QQ 音乐歌手 ID；空值返回 ''
 * @returns {string} 同源相对路径 ./singers/singer_<mid>.jpg
 */
export function singerPhotoUrl(singermid) {
  if (!singermid) return '';
  if (COVER_BASE) return `${COVER_BASE}/singers/singer_${singermid}.jpg`;
  return `./singers/singer_${singermid}.jpg`;
}

/** jsDelivr 歌手头像兜底 */
export function jsDelivrSingerUrl(singermid) {
  if (!singermid) return '';
  return `https://cdn.jsdelivr.net/gh/${REPO}@${COVER_REF}/public/singers/singer_${singermid}.jpg`;
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
