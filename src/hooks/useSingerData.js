// src/hooks/useSingerData.js — 歌手数据懒加载 hook
// 歌曲数据从 public/singerData/{id}.json 按需 fetch，不再静态 import
// 这样 index.html 只包含应用代码（~200KB），歌手数据（~300-600KB/个）在选中时才加载
//
// 合并静态数据中的 nid/chorus 字段，修复图片路径
// 运行时应用 Live/伴奏过滤 + baseKey 去重（兼容旧数据）

import { useState, useEffect, useRef } from 'react';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';
import { STATIC_SINGERS } from '../data/singers.js';
import { baseKey } from '../utils/text.js';

// ---------- 数据缓存（模块级，跨组件复用）----------
const dataCache = new Map(); // singerId -> transformed data
const fetchPromiseCache = new Map(); // singerId -> in-flight Promise

// ---------- Live/伴奏过滤（照搬 music-cup api.js，运行时兜底）----------
const LIVE_TRACK_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /[-–—~]\s*live\b/i,
  /\blive\s*(version|ver\.?|session|sessions|edit|recording|album)\b/i,
  /\b(in concert|unplugged)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|音乐节|音樂節|live版|巡回|巡迴|巡演|不插电|不插電|演奏会|演奏會)/i,
];
const LIVE_ALBUM_PATTERNS = [
  /[([（【][^)\]）】]*(live|unplugged)[^)\]）】]*[)\]）】]/i,
  /\blive\s+(at|from|in|on|@)\b/i,
  /^live\b/i,
  /\blive!?$/i,
  /\b(in concert|unplugged|world tour)\b/i,
  /(现场|現場|演唱会|演唱會|音乐会|音樂會|巡回|巡迴|巡演|不插电|不插電)/,
];
const JUNK_TRACK = /(\binstrumental\b|伴奏|卡拉OK|karaoke|off\s?vocal|纯音乐|純音樂|\bcommentary\b|\bvoice memo\b)/i;

function isLiveTrack(name) {
  return LIVE_TRACK_PATTERNS.some((re) => re.test(name));
}
function isLiveAlbum(albumName) {
  return LIVE_ALBUM_PATTERNS.some((re) => re.test(albumName || ''));
}
function isJunkTrack(name) {
  return JUNK_TRACK.test(name);
}

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
  const albumDescs = raw.albumDescs || {};

  // 运行时过滤 Live/伴奏 + baseKey 去重 + 低收藏量无封面过滤
  const MIN_FAV_WITHOUT_COVER = 1000; // 无封面时收藏量需≥1000才保留
  const seenKeys = new Set();
  const filteredSongs = [];
  for (const song of raw.entrants) {
    const name = (song.name || '').trim();
    if (!name) continue;
    if (isJunkTrack(name)) continue;
    if (isLiveTrack(name)) continue;
    if (isLiveAlbum(song.albumName)) continue;
    // 无专辑封面且收藏量过低 → 过滤掉（串烧/翻唱/花絮等低质量条目）
    const hasCover = !!(song.albumMid || song.pic);
    const fav = song.favCount || 0;
    if (!hasCover && fav < MIN_FAV_WITHOUT_COVER) continue;
    const key = baseKey(name);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    filteredSongs.push(song);
  }

  // 按收藏量降序排序，收藏量高的作为种子选手
  const sortedByFav = [...filteredSongs].sort(
    (a, b) => (b.favCount || 0) - (a.favCount || 0),
  );

  // 构建 songmid → seedRank 映射（收藏量越高 seedRank 越小）
  const seedRankByMid = new Map();
  sortedByFav.forEach((song, idx) => {
    seedRankByMid.set(song.songmid, idx + 1);
  });

  const allEntrants = filteredSongs.map((song, i) => {
    const normName = normalizeName(song.name);
    const staticMatch = staticNameMap.get(normName);

    const cdnPic = song.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albumMid}.jpg`
      : '';
    // 歌曲封面 fallback：当无专辑封面时使用歌曲封面
    const songCdnPic = song.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
      : '';

    // seedRank 基于收藏量排序，而非数组索引
    const sr = seedRankByMid.get(song.songmid) || i + 1;

    return {
      name: song.name,
      id: i,
      side: i < filteredSongs.length / 2 ? 'L' : 'R',
      seed: sr,
      nid: song.nid ?? staticMatch?.nid ?? null,
      songmid: song.songmid,
      songid: song.songid,
      pic: cdnPic || songCdnPic,
      picLocal: toRelativePath(song.pic),
      songPic: songCdnPic,
      albumMid: song.albumMid,
      albumName: song.albumName,
      albumDate: song.albumDate || '',
      albumType: song.albumType || '',
      albumDesc: albumDescs[song.albumMid] || '',
      chorus: song.chorus ?? staticMatch?.chorus ?? null,
      seedRank: sr,
      isSeed: sr <= Math.min(32, filteredSongs.length),
      // 预取的 iTunes 试听数据（由 fetch-itunes-previews.js 写入）
      itunesPreviewUrl: song.itunesPreviewUrl || '',
      itunesTrackUrl: song.itunesTrackUrl || '',
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

/**
 * 异步加载并转换歌手数据（带缓存）
 * @param {string} singerId
 * @returns {Promise<object|null>}
 */
async function loadSingerData(singerId) {
  // 1. 命中缓存直接返回
  if (dataCache.has(singerId)) {
    return dataCache.get(singerId);
  }

  // 2. 去重：同一歌手的并发请求复用同一个 Promise
  if (fetchPromiseCache.has(singerId)) {
    return fetchPromiseCache.get(singerId);
  }

  const promise = (async () => {
    const registry = SINGER_REGISTRY[singerId];
    if (!registry) return null;

    try {
      // 从 public/singerData/{id}.json 按需加载
      const res = await fetch(`./singerData/${singerId}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = transformToSingerData(raw, registry, singerId);
      dataCache.set(singerId, data);
      return data;
    } catch (err) {
      // fetch 失败 → 降级到静态数据
      const fallback = STATIC_SINGERS[singerId] || null;
      if (fallback) dataCache.set(singerId, fallback);
      return fallback;
    }
  })();

  fetchPromiseCache.set(singerId, promise);
  try {
    return await promise;
  } finally {
    fetchPromiseCache.delete(singerId);
  }
}

/**
 * 加载歌手数据（懒加载版）
 * 首次切换到某歌手时 fetch JSON，后续从缓存读取
 * @param {string} singerId - 歌手 ID（stefanie/jj/jay/jolin/david/she/eason）
 * @returns {{singerData: object|null, loading: boolean, error: string|null}}
 */
export function useSingerData(singerId) {
  // 初始值：如果缓存里有就用缓存，否则 null（显示加载中）
  const [singerData, setSingerData] = useState(() => dataCache.get(singerId) || null);
  const [loading, setLoading] = useState(() => !dataCache.has(singerId));
  const [error, setError] = useState(null);
  const lastSingerRef = useRef(singerId);

  useEffect(() => {
    if (lastSingerRef.current !== singerId) {
      lastSingerRef.current = singerId;
    }

    // 缓存命中：同步设置
    if (dataCache.has(singerId)) {
      setSingerData(dataCache.get(singerId));
      setLoading(false);
      setError(null);
      return;
    }

    // 需要 fetch
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadSingerData(singerId).then((data) => {
      if (cancelled) return;
      if (data) {
        setSingerData(data);
        setError(null);
      } else {
        setSingerData(STATIC_SINGERS[singerId] || null);
        setError(singerId ? '数据加载失败' : null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [singerId]);

  return { singerData, loading, error };
}
