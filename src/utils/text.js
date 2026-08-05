// src/utils/text.js — baseKey 实现见 functions/_shared/text-utils.mjs（前后端共用）。
// 此处保留 baseKey 的 re-export 以维持既有 import 路径不变（itunes / qqMusic /
// useDynamicSinger / useSingerData 均从本文件取 baseKey）；displayName 为前端
// 专用展示名清洗逻辑，留在本文件。

export { baseKey } from '../../functions/_shared/text-utils.mjs';

/**
 * 剥离括号注记后的展示名
 * @param {string} name - 原始歌曲名
 * @returns {string} 清洗后的展示名
 */
export function displayName(name) {
  let s = String(name).normalize('NFKC');
  s = s.replace(/[([（【][^)\]）】]*[)\]）】]/g, '').trim();
  return s || String(name).trim();
}
