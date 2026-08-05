// functions/_shared/server-filter.mjs
//
// 服务端筛选单一来源：单接口 /api/singer/[mid] 与批量接口 /api/singers/batch
// 共用同一份实现，杜绝规则漂移。
//
// 逻辑：Live/伴奏/串烧丢弃 + 低收藏量未分类曲目丢弃 + baseKey 去重，
// 再按收藏量降序排序并回填 seedRank（与前端原慢路径算法一致）。

import {
  isJunkTrack,
  isLiveTrack,
  isLiveAlbum,
  isMedleyTrack,
  shouldKeepByFavOrAlbum,
  MIN_FAV_LOOSE,
} from './filters.mjs';
import { baseKey } from './text-utils.mjs';

/**
 * 服务端筛选
 * @param {Array} entrants
 * @param {{dedupe?: boolean, minFav?: number, limit?: number}} opts
 *   - dedupe: baseKey 去重（默认 true）
 *   - minFav: 未分类曲目收藏量阈值（默认 MIN_FAV_LOOSE）
 *   - limit: 排序后截断条数（0 = 不截断）。用于按对阵树大小裁剪返回量
 * @returns {Array}
 */
export function applyServerFilter(
  entrants,
  { dedupe = true, minFav = MIN_FAV_LOOSE, limit = 0 } = {},
) {
  const seenKeys = new Set();
  const out = [];
  for (const song of entrants || []) {
    const name = (song.name || '').trim();
    if (!name) continue;
    if (isJunkTrack(name)) continue;
    if (isLiveTrack(name)) continue;
    if (isLiveAlbum(song.albumName)) continue;
    if (isMedleyTrack(name)) continue;
    if (!shouldKeepByFavOrAlbum(song, minFav)) continue;
    if (dedupe) {
      const key = baseKey(name);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }
    out.push(song);
  }
  out.sort((a, b) => (b.favCount || 0) - (a.favCount || 0));
  if (limit > 0) out.length = Math.min(out.length, limit);
  out.forEach((s, i) => {
    s.seedRank = i + 1;
  });
  return out;
}
