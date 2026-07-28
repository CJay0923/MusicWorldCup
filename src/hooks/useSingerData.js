// src/hooks/useSingerData.js — 本地预取歌手数据加载 hook
// 歌曲数据从预取的本地 JSON 文件加载，无需后端或网络请求
// 合并静态数据中的 nid/chorus 字段，修复图片相对路径

import { useState, useEffect } from 'react';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';
import { STATIC_SINGERS } from '../data/singers.js';

// 预取的本地歌手数据
import stefanieData from '../data/singerData/stefanie.json';
import jjData from '../data/singerData/jj.json';
import jayData from '../data/singerData/jay.json';
import jolinData from '../data/singerData/jolin.json';
import davidData from '../data/singerData/david.json';

const LOCAL_DATA = {
  stefanie: stefanieData,
  jj: jjData,
  jay: jayData,
  jolin: jolinData,
  david: davidData,
};

/**
 * 规范化歌名用于匹配（去括号内容、去空格、转小写）
 */
function normalizeName(name) {
  if (!name) return '';
  let s = name.replace(/[（(].*?[)）]/g, ''); // 移除半角/全角括号内容
  s = s.replace(/[【\[].*?[\]】]/g, ''); // 移除中括号内容
  s = s.replace(/[（(）)]/g, ''); // 移除残留的孤立括号
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * 将绝对路径 /covers/... 转为相对路径 ./covers/...
 * 适配 base: './' 的静态部署
 */
function toRelativePath(path) {
  if (!path) return '';
  if (path.startsWith('/')) return '.' + path;
  return path;
}

/**
 * 为指定歌手构建静态数据的歌名 -> {nid, chorus} 映射表
 */
const staticNameMapCache = {};
function buildStaticNameMap(singerId) {
  if (staticNameMapCache[singerId]) return staticNameMapCache[singerId];
  const staticSinger = STATIC_SINGERS[singerId];
  const map = new Map();
  if (staticSinger?.entrants) {
    for (const e of staticSinger.entrants) {
      const key = normalizeName(e.name);
      if (key) {
        map.set(key, { nid: e.nid || null, chorus: e.chorus || null });
      }
    }
  }
  staticNameMapCache[singerId] = map;
  return map;
}

/**
 * 将本地预取的 JSON 数据转换为 entrant 格式（兼容现有 SINGERS 结构）
 * 合并静态数据的 nid/chorus，修复图片路径
 */
function transformToSingerData(raw, registry, singerId) {
  const staticNameMap = buildStaticNameMap(singerId);

  // 按收藏量降序排序，收藏量高的作为种子选手
  const sortedByFav = [...raw.entrants].sort(
    (a, b) => (b.favCount || 0) - (a.favCount || 0),
  );

  // 构建 songmid → seedRank 映射（收藏量越高 seedRank 越小）
  const seedRankByMid = new Map();
  sortedByFav.forEach((song, idx) => {
    seedRankByMid.set(song.songmid, idx + 1);
  });

  const allEntrants = raw.entrants.map((song, i) => {
    const normName = normalizeName(song.name);
    const staticMatch = staticNameMap.get(normName);

    const cdnPic = song.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albumMid}.jpg`
      : '';

    // seedRank 基于收藏量排序，而非数组索引
    const sr = seedRankByMid.get(song.songmid) || i + 1;

    return {
      name: song.name,
      id: i,
      side: i < raw.entrants.length / 2 ? 'L' : 'R',
      seed: sr,
      nid: song.nid ?? staticMatch?.nid ?? null,
      songmid: song.songmid,
      songid: song.songid,
      pic: cdnPic,
      picLocal: toRelativePath(song.pic),
      albumMid: song.albumMid,
      albumName: song.albumName,
      albumDate: song.albumDate || '',
      albumType: song.albumType || '',
      chorus: staticMatch?.chorus ?? null,
      seedRank: sr,
      isSeed: sr <= Math.min(32, raw.entrants.length),
    };
  });

  return {
    name: raw.singerName || registry.name,
    nameEn: registry.nameEn,
    bracketSize: registry.bracketSize,
    entrants: allEntrants,
    seeds: allEntrants.map((_, i) => i),
    seedRank: Object.fromEntries(allEntrants.map((e, i) => [i, e.seedRank])),
    singerPhoto: `https://y.gtimg.cn/music/photo_new/T001R300x300M000${raw.singermid}.jpg`,
    source: 'local',
  };
}

// 预转换缓存（模块级，只转换一次）
const transformedCache = {};

function getTransformed(singerId) {
  if (transformedCache[singerId]) return transformedCache[singerId];
  const registry = SINGER_REGISTRY[singerId];
  const raw = LOCAL_DATA[singerId];
  if (!registry || !raw) return null;
  const data = transformToSingerData(raw, registry, singerId);
  transformedCache[singerId] = data;
  return data;
}

/**
 * 加载本地预取的歌手数据
 * @param {string} singerId - 歌手 ID（stefanie/jj/jay/jolin/david）
 * @returns {{singerData: object|null, loading: boolean, error: string|null}}
 */
export function useSingerData(singerId) {
  const [singerData, setSingerData] = useState(() => getTransformed(singerId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const data = getTransformed(singerId);
    if (data) {
      setSingerData(data);
      setError(null);
    } else {
      // 降级到静态数据
      setSingerData(STATIC_SINGERS[singerId] || null);
      setError(singerId ? '无本地数据，使用静态降级' : null);
    }
    setLoading(false);
  }, [singerId]);

  return { singerData, loading, error };
}
