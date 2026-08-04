// src/hooks/useSingerData.js — 歌手数据加载 hook
//
// 数据来源优先级（生产构建已把歌手 JSON 移出包体，改走后端 D1）：
//   1. 生产：fetch /api/singer/[mid]（D1 关系表重组的 raw JSON）
//   2. 开发：直接 fetch Vite dev server 的 /src/data/singerData/{id}.json
//   3. 线上兜底：jsDelivr 上仓库内的原始 src/data/singerData/{id}.json
//   4. 最终兜底：STATIC_SINGERS 元数据（无 entrants，仅保证不崩）
// 任意一层失败都有回退，详见 loadSingerData()。
//
// 合并静态数据中的 nid/chorus 字段，修复图片路径
// 运行时应用 Live/伴奏过滤 + baseKey 去重（兼容旧数据）

import { useState, useEffect, useRef } from 'react';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';
import { STATIC_SINGERS } from '../data/singers.js';
import { baseKey } from '../utils/text.js';
import { coverUrl } from '../lib/assets.js';
import {
  isLiveTrack,
  isLiveAlbum,
  isJunkTrack,
  isMedleyTrack,
  shouldKeepByFavOrAlbum,
} from '../utils/filters.js';

// ---------- 数据缓存（模块级，跨组件复用）----------
// LRU 缓存：最多保留 4 位歌手的已 transform 数据，避免长会话内存无限增长
const DATA_CACHE_MAX = 4;
const dataCache = new Map(); // singerId -> transformed data
const fetchPromiseCache = new Map(); // singerId -> in-flight Promise

function evictIfNeeded() {
  if (dataCache.size <= DATA_CACHE_MAX) return;
  // Map 保持插入顺序，删除最早的（LRU）
  const oldest = dataCache.keys().next().value;
  if (oldest !== undefined) dataCache.delete(oldest);
}

function cacheSingerData(singerId, data) {
  if (dataCache.has(singerId)) dataCache.delete(singerId); // 重新插入到末尾
  dataCache.set(singerId, data);
  evictIfNeeded();
}

/**
 * 将本地预取的 JSON 数据转换为 entrant 格式
 *
 * 如果数据已预处理（raw.preprocessed === true），走快速路径：
 * - 跳过 Live/伴奏正则过滤（下载时已过滤）
 * - 跳过 favCount 排序（已预排序）
 * - 跳过 seedRank 映射构建（已预计算）
 * - 跳过 normalizeName/staticNameMap（STATIC_SINGERS 全为空，无 nid/chorus 可合并）
 *
 * 图片路径策略：
 * - picLocal → ./covers/album_{albumMid}.jpg（本地预下载封面，加载最快）
 * - pic → CDN URL（picLocal 加载失败时的 fallback）
 */
function transformToSingerData(raw, registry, singerId) {
  const albumDescs = raw.albumDescs || {};

  // ===== 快速路径：已预处理的数据 =====
  // 信任下载脚本的预处理（已做专辑归属、Live/伴奏/串烧、收藏量阈值与补足过滤），
  // 运行时不再二次过滤，避免与下载时的"放宽补足到 128"逻辑冲突。
  if (raw.preprocessed === true) {
    const prefilteredEntrants = raw.entrants;

    const half = prefilteredEntrants.length / 2;
    const seedThreshold = Math.min(32, prefilteredEntrants.length);
    const allEntrants = prefilteredEntrants.map((song, i) => {
      const albumMid = song.albumMid || '';
      const sr = song.seedRank || i + 1;

      // pic: 优先用 JSON 中的值（旧格式），否则从 albumMid 重建 CDN URL
      const cdnAlbumPic = albumMid
        ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
        : '';
      const cdnSongPic = song.songmid
        ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
        : '';

      return {
        name: song.name,
        id: i,
        side: i < half ? 'L' : 'R',
        seed: sr,
        nid: null,
        songmid: song.songmid,
        songid: song.songid,
        pic: song.pic || cdnAlbumPic || cdnSongPic,
        picLocal: coverUrl(albumMid),
        songPic: song.songPic || cdnSongPic,
        albumMid,
        albumName: song.albumName,
        albumDate: song.albumDate || '',
        albumType: song.albumType || '',
        albumDesc: song.albumDesc || albumDescs[albumMid] || '',
        chorus: null,
        seedRank: sr,
        isSeed: sr <= seedThreshold,
        itunesPreviewUrl: song.itunesPreviewUrl || '',
        itunesTrackUrl: song.itunesTrackUrl || '',
        miguPreviewUrl: song.miguPreviewUrl || '',
        favCount: song.favCount || 0,  // 保留收藏量字段
      };
    });

    return {
      name: raw.singerName || registry.name,
      nameEn: registry.nameEn,
      bracketSize: registry.bracketSize,
      entrants: allEntrants,
      seeds: allEntrants.map((_, i) => i),
      seedRank: Object.fromEntries(allEntrants.map((e, i) => [i, e.seedRank])),
      singerPhoto: raw.singerPhoto
        ? (raw.singerPhoto.startsWith('/') ? '.' + raw.singerPhoto : raw.singerPhoto)
        : `https://y.gtimg.cn/music/photo_new/T001R300x300M000${raw.singermid || singerId}.jpg`,
      source: 'local',
    };
  }

  // ===== 慢速路径：未预处理的数据（向后兼容）=====
  // 运行时过滤 Live/伴奏 + baseKey 去重 + 低收藏量无封面过滤
  const seenKeys = new Set();
  const filteredSongs = [];
  for (const song of raw.entrants) {
    const name = (song.name || '').trim();
    if (!name) continue;
    if (isJunkTrack(name)) continue;
    if (isLiveTrack(name)) continue;
    if (isLiveAlbum(song.albumName)) continue;
    if (isMedleyTrack(name)) continue;
    // 专辑内歌曲（有 albumMid）无论收藏量都保留；未分类歌曲按收藏量阈值过滤
    if (!shouldKeepByFavOrAlbum(song)) continue;
    const key = baseKey(name);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    filteredSongs.push(song);
  }

  const sortedByFav = [...filteredSongs].sort(
    (a, b) => (b.favCount || 0) - (a.favCount || 0),
  );

  const seedRankByMid = new Map();
  sortedByFav.forEach((song, idx) => {
    seedRankByMid.set(song.songmid, idx + 1);
  });

  const half2 = filteredSongs.length / 2;
  const seedThreshold2 = Math.min(32, filteredSongs.length);
  const allEntrants = filteredSongs.map((song, i) => {
    const albumMid = song.albumMid || '';
    const cdnAlbumPic = albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg`
      : '';
    const cdnSongPic = song.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${song.songmid}.jpg`
      : '';
    const sr = seedRankByMid.get(song.songmid) || i + 1;

    return {
      name: song.name,
      id: i,
      side: i < half2 ? 'L' : 'R',
      seed: sr,
      nid: null,
      songmid: song.songmid,
      songid: song.songid,
      pic: cdnAlbumPic || cdnSongPic,
      picLocal: coverUrl(albumMid),
      songPic: cdnSongPic,
      albumMid,
      albumName: song.albumName,
      albumDate: song.albumDate || '',
      albumType: song.albumType || '',
      albumDesc: albumDescs[albumMid] || '',
      chorus: null,
      seedRank: sr,
      isSeed: sr <= seedThreshold2,
      itunesPreviewUrl: song.itunesPreviewUrl || '',
      itunesTrackUrl: song.itunesTrackUrl || '',
      miguPreviewUrl: song.miguPreviewUrl || '',
      favCount: song.favCount || 0,  // 保留收藏量字段
    };
  });

  return {
    name: raw.singerName || registry.name,
    nameEn: registry.nameEn,
    bracketSize: registry.bracketSize,
    entrants: allEntrants,
    seeds: allEntrants.map((_, i) => i),
    seedRank: Object.fromEntries(allEntrants.map((e, i) => [i, e.seedRank])),
    singerPhoto: `https://y.gtimg.cn/music/photo_new/T001R300x300M000${raw.singermid || singerId}.jpg`,
    source: 'local',
  };
}

/**
 * 加载歌手数据（带缓存和去重）
 *
 * 数据来源优先级（生产构建把歌手 JSON 完全移出包体，改走后端 D1）：
 *   1. 生产环境 / 已绑 D1：fetch /api/singer/[mid]（D1 关系表重组的 raw JSON）
 *   2. 开发环境：直接 fetch Vite dev server 的源码 JSON（/src/data/singerData/{id}.json）
 *   3. 线上兜底：jsDelivr 上仓库内的原始 src/data/singerData/{mid}.json
 *   4. 最终兜底：STATIC_SINGERS 元数据（无 entrants，仅保证不崩）
 *
 * 这样生产包体不再包含 6MB 歌手 JSON，且任意一层失败都有回退。
 * @param {string} singerId
 * @returns {Promise<object|null>}
 */
export async function loadSingerData(singerId) {
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

    let raw = null;

    // ① 生产优先：后端 D1 API（dev 下 /api/singer 不存在，自动跳过）
    if (!import.meta.env.DEV) {
      raw = await fetchSingerFromApi(singerId);
    }

    // ② 开发期兜底：直接 fetch Vite dev server 的源码 JSON（生产构建不存在该路径，自动跳过）
    if (!raw && import.meta.env.DEV) {
      raw = await loadBundledSinger(singerId);
    }

    // ③ 线上兜底：jsDelivr 原始仓库 JSON（生产环境 API 故障时的离线降级）
    if (!raw) {
      raw = await fetchSingerFromJsDelivr(singerId);
    }

    if (!raw) {
      const fallback = STATIC_SINGERS[singerId] || null;
      if (fallback) cacheSingerData(singerId, fallback);
      return fallback;
    }

    const data = transformToSingerData(raw, registry, singerId);
    cacheSingerData(singerId, data);
    return data;
  })();

  fetchPromiseCache.set(singerId, promise);
  try {
    return await promise;
  } finally {
    fetchPromiseCache.delete(singerId);
  }
}

/** 从后端 D1 API 拉取 raw JSON；任何非 200 / 业务错误都返回 null 触发兜底 */
async function fetchSingerFromApi(singerId) {
  try {
    const res = await fetch(`/api/singer/${encodeURIComponent(singerId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.error) return null;
    if (!Array.isArray(json.entrants) || json.entrants.length === 0) return null;
    return json;
  } catch {
    return null;
  }
}

/** 开发期：直接从 Vite dev server 拉取源码内的歌手 JSON（零打包，不进生产包） */
async function loadBundledSinger(singerId) {
  try {
    const res = await fetch(`/src/data/singerData/${encodeURIComponent(singerId)}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** 线上兜底：jsDelivr 上仓库内的原始歌手 JSON（与 src/data/singerData 同构） */
async function fetchSingerFromJsDelivr(singerId) {
  try {
    const url = `https://cdn.jsdelivr.net/gh/CJay0923/MusicWorldCup@main/src/data/singerData/${encodeURIComponent(singerId)}.json`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !Array.isArray(json.entrants) || json.entrants.length === 0) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * 加载歌手数据（懒加载版）
 * 实际数据获取见 loadSingerData()：生产走 /api/singer（D1），开发走 dev server 源码 JSON，兜底走 jsDelivr
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

    // 需要 dynamic import
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
