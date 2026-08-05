// functions/_shared/filters.mjs
// 歌曲过滤规则（纯函数，无 DOM / 无 Workers API）——前后端共用单一来源。
// 被前端（Vite 打包）与 Cloudflare Pages Functions（边缘运行）同时 import，
// 任何规则调整只需改这里一处，消除前后端规则漂移。
//
// 注意：本文件被放进 functions/_shared/（下划线前缀，Cloudflare 不会当成路由），
// 以保证 Pages Functions 构建能可靠打包；前端经 src/utils/filters.js 薄壳 re-export 复用。

export const LIVE_TRACK_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /[-–—~]\s*live\b/i,
  /\blive\s*(version|ver\.?|session|sessions|edit|recording|album)\b/i,
  /\b(in concert|unplugged)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|音乐节|音樂節|live版|巡回|巡迴|巡演|不插电|不插電|演奏会|演奏會)/i,
];

export const LIVE_ALBUM_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /^live\b/i,
  /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];

export const JUNK_TRACK_PATTERN =
  /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b)/i;

export const MEDLEY_TRACK_PATTERN =
  /(串烧|串燒|翻唱|致敬|\bmedley\b|\bmashup\b)/i;

export function isMedleyTrack(name) {
  return MEDLEY_TRACK_PATTERN.test(name) || /\+/.test(name);
}

export function isLiveTrack(name) {
  return LIVE_TRACK_PATTERNS.some((re) => re.test(name));
}

export function isLiveAlbum(albumName) {
  return LIVE_ALBUM_PATTERNS.some((re) => re.test(albumName || ''));
}

export function isJunkTrack(name) {
  return JUNK_TRACK_PATTERN.test(name);
}

// 未分类歌曲（无 albumMid 的独立单曲）的收藏量保留阈值
export const MIN_FAV_LOOSE = 20000;

/**
 * 判断歌曲是否保留：
 * - 有 albumMid 的专辑内歌曲：始终保留（下载时已校验专辑归属）
 * - 无 albumMid 的未分类歌曲：收藏量 >= threshold 才保留
 * @param {{albumMid?: string, favCount?: number}} song
 * @param {number} [threshold] 覆盖默认 MIN_FAV_LOOSE（仅对未分类歌曲生效）
 * @returns {boolean}
 */
export function shouldKeepByFavOrAlbum(song, threshold = MIN_FAV_LOOSE) {
  if (song && song.albumMid) return true;
  return (song && song.favCount || 0) >= threshold;
}
