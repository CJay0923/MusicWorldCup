// src/utils/filters.js — 共享的歌曲过滤工具
// 统一 Live/伴奏/垃圾曲目过滤逻辑，被 useSingerData.js 和 useDynamicSinger.js 复用
// 避免正则数组在多个文件中重复定义

/**
 * Live 版本曲目匹配正则（按歌曲名判断）
 * 匹配带 (live)、Live at、现场版、演唱会等标记的曲目
 */
export const LIVE_TRACK_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /[-–—~]\s*live\b/i,
  /\blive\s*(version|ver\.?|session|sessions|edit|recording|album)\b/i,
  /\b(in concert|unplugged)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|音乐节|音樂節|live版|巡回|巡迴|巡演|不插电|不插電|演奏会|演奏會)/i,
];

/**
 * Live 版本专辑匹配正则（按专辑名判断）
 */
export const LIVE_ALBUM_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /^live\b/i,
  /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];

/**
 * 垃圾曲目匹配正则（伴奏、卡拉OK、纯音乐等）
 */
export const JUNK_TRACK_PATTERN =
  /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b)/i;

/**
 * 串烧/翻唱/致敬曲目匹配正则
 * 匹配 现场串烧、多曲拼接（"A+B"）、翻唱、致敬等
 */
export const MEDLEY_TRACK_PATTERN =
  /(串烧|串燒|翻唱|致敬|\bmedley\b|\bmashup\b)/i;

/**
 * 判断歌曲名是否为串烧/翻唱
 * 含 + 号拼接多曲、串烧/翻唱/致敬/medley/mashup 关键词
 * @param {string} name - 歌曲名
 * @returns {boolean}
 */
export function isMedleyTrack(name) {
  return MEDLEY_TRACK_PATTERN.test(name) || /\+/.test(name);
}

/**
 * 判断歌曲名是否为 Live 版本
 * @param {string} name - 歌曲名
 * @returns {boolean}
 */
export function isLiveTrack(name) {
  return LIVE_TRACK_PATTERNS.some((re) => re.test(name));
}

/**
 * 判断专辑名是否为 Live 专辑
 * @param {string} albumName - 专辑名
 * @returns {boolean}
 */
export function isLiveAlbum(albumName) {
  return LIVE_ALBUM_PATTERNS.some((re) => re.test(albumName || ''));
}

/**
 * 判断歌曲名是否为垃圾曲目（伴奏/卡拉OK/纯音乐等）
 * @param {string} name - 歌曲名
 * @returns {boolean}
 */
export function isJunkTrack(name) {
  return JUNK_TRACK_PATTERN.test(name);
}

/**
 * 未分类歌曲（无 albumMid 的独立单曲）的收藏量保留阈值
 * 专辑内歌曲（有 albumMid 且归属正确）无论收藏量多低都保留，
 * 只有未分类歌曲才按收藏量判断。
 */
export const MIN_FAV_LOOSE = 20000;

/**
 * 判断歌曲是否保留：
 * - 有 albumMid 的专辑内歌曲：始终保留（下载时已校验专辑归属）
 * - 无 albumMid 的未分类歌曲：收藏量 >= MIN_FAV_LOOSE 才保留
 * @param {{albumMid?: string, favCount?: number}} song
 * @returns {boolean}
 */
export function shouldKeepByFavOrAlbum(song) {
  if (song && song.albumMid) return true;
  return (song && song.favCount || 0) >= MIN_FAV_LOOSE;
}
