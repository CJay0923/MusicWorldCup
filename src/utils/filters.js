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
 * 无封面且低收藏量的曲目过滤阈值
 */
export const MIN_FAV_WITHOUT_COVER = 1000;
