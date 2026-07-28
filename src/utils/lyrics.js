// src/utils/lyrics.js — LRC 歌词解析器
// 解析 [mm:ss.xx]歌词 格式，支持时间戳查找当前行

const LRC_LINE_RE = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/;

/**
 * 解析 LRC 歌词文本
 * @param {string} lrcText - LRC 格式歌词
 * @returns {Array<{time:number, text:string}>}
 */
export function parseLRC(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];

  for (const line of lines) {
    const match = line.match(LRC_LINE_RE);
    if (!match) continue;

    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = match[4].trim();

    if (text) {
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * 根据当前播放时间找到当前歌词行索引 (二分查找)
 * @param {Array<{time:number, text:string}>} lines - 解析后的歌词行
 * @param {number} currentTime - 当前播放时间(秒)
 * @returns {number} 当前行索引，-1 表示未找到
 */
export function findLyricIndex(lines, currentTime) {
  if (!lines || lines.length === 0) return -1;

  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}
