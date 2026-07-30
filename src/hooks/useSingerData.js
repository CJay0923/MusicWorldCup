// src/hooks/useSingerData.js — 歌手数据加载 hook
// 方案B：歌手数据通过 Vite import.meta.glob 预打包为 JS 模块
// 不再从 public/ fetch JSON，而是通过 ES module import 加载
// 优点：无独立 HTTP 请求，Vite build 自动 minify + gzip，切换歌手零延迟
//
// 合并静态数据中的 nid/chorus 字段，修复图片路径
// 运行时应用 Live/伴奏过滤 + baseKey 去重（兼容旧数据）

import { useState, useEffect, useRef } from 'react';
import { SINGER_REGISTRY } from '../data/singerRegistry.js';
import { STATIC_SINGERS } from '../data/singers.js';
import { baseKey } from '../utils/text.js';
import {
  isLiveTrack,
  isLiveAlbum,
  isJunkTrack,
  MIN_FAV_WITHOUT_COVER,
} from '../utils/filters.js';

// ---------- 预打包的歌手数据（通过 import.meta.glob 懒加载）----------
// eager: false → 每个 JSON 成为独立 chunk，按需加载（不内联到主 bundle）
// Vite 自动处理 chunk 分割和命名，配合 manualChunks 进一步优化
const singerDataLoaders = import.meta.glob(
  '../data/singerData/*.json',
  { eager: false, import: 'default' },
);

// ---------- 数据缓存（模块级，跨组件复用）----------
const dataCache = new Map(); // singerId -> transformed data
const fetchPromiseCache = new Map(); // singerId -> in-flight Promise

/**
 * 从预打包的模块中获取懒加载器
 */
function getSingerDataLoader(singerId) {
  const key = `../data/singerData/${singerId}.json`;
  return singerDataLoaders[key] || null;
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
  if (raw.preprocessed === true) {
    const half = raw.entrants.length / 2;
    const seedThreshold = Math.min(32, raw.entrants.length);
    const allEntrants = raw.entrants.map((song, i) => {
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
        picLocal: albumMid ? `./covers/album_${albumMid}.jpg` : '',
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
        : `https://y.gtimg.cn/music/photo_new/T001R300x300M000${raw.singermid}.jpg`,
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
    const hasCover = !!(song.albumMid || song.pic);
    const fav = song.favCount || 0;
    if (!hasCover && fav < MIN_FAV_WITHOUT_COVER) continue;
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
      picLocal: albumMid ? `./covers/album_${albumMid}.jpg` : '',
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
 * 加载歌手数据（从 Vite chunk 异步加载，带缓存和去重）
 * 数据通过 import.meta.glob 懒加载，每个歌手的数据是独立 JS chunk
 * 相比 fetch JSON：无 CORS 问题、Vite 自动 minify、可被浏览器缓存
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

    try {
      const loader = getSingerDataLoader(singerId);
      if (!loader) {
        // 预打包数据中没有 → 降级到静态数据
        const fallback = STATIC_SINGERS[singerId] || null;
        if (fallback) dataCache.set(singerId, fallback);
        return fallback;
      }

      // 动态 import 加载歌手数据 chunk
      const raw = await loader();
      const data = transformToSingerData(raw, registry, singerId);
      dataCache.set(singerId, data);
      return data;
    } catch (err) {
      // chunk 加载失败 → 降级到静态数据
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
 * 通过 import.meta.glob 动态 import 加载，每位歌手的数据是独立 Vite chunk
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
