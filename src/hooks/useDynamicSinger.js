// src/hooks/useDynamicSinger.js — 运行时动态歌手搜索与加载 hook
// 通过 QQ Music JSONP 接口在运行时搜索任意歌手并加载其歌曲数据，
// 适配 surge.sh 静态部署（无需后端）。
//
// 复用 useSingerData.js 的 Live/伴奏过滤与 baseKey 去重逻辑，
// 将运行时歌曲数据转换为与本地预取数据兼容的 entrant 格式，
// 使动态歌手可直接接入现有经典 / 世界杯 / 自选三种游戏流程。
//
// 与 useSingerData 的差异：
//   - 运行时无 favCount（统一设为 0），种子排位改用 API 返回顺序（已按热度排序）
//   - 无静态 nid/chorus/iTunes 预取数据（试听回退到运行时 iTunes 搜索 / QQ 流媒体）
//   - 专辑详情在歌曲加载完成后后台异步拉取，到位后渐进式更新歌手数据

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  searchSingers,
  fetchSingerSongs,
  fetchAlbumDetail,
  fetchKugouHeatBatch,
} from '../lib/qqMusic.js';
import { baseKey } from '../utils/text.js';
import { isLiveTrack, isLiveAlbum, isJunkTrack, isMedleyTrack, shouldKeepByFavOrAlbum } from '../utils/filters.js';
import { qqCoverUrl, singerPhotoUrl } from '../lib/assets.js';

/**
 * 根据可用歌曲数计算经典模式最大淘汰赛规模（2 的幂，4~128）
 */
function computeBracketSize(count) {
  for (const b of [128, 64, 32, 16, 8, 4]) {
    if (count >= b) return b;
  }
  return 4;
}

/**
 * 将运行时拉取的歌曲列表转换为与 useSingerData 兼容的歌手数据结构。
 * 应用 Live/伴奏过滤 + baseKey 去重；种子排位使用 API 顺序（已按热度排序）。
 *
 * @param {{songs: Array, singerName: string, singermid: string}} raw
 * @param {Map<string, {albumType, albumDesc}>} [albumDetails] - 专辑详情映射（可选）
 * @param {Object<string, number>} [favMap] - 收藏量映射（可选）
 * @returns {{name, nameEn, bracketSize, entrants, seeds, seedRank, singerPhoto, source}}
 */
export function transformDynamicSingerData(raw, albumDetails, favMap) {
  const seenKeys = new Set();
  const filteredSongs = [];
  for (const song of raw.songs) {
    const name = (song.name || '').trim();
    if (!name) continue;
    if (isJunkTrack(name)) continue;
    if (isLiveTrack(name)) continue;
    if (isLiveAlbum(song.albumName)) continue;
    if (isMedleyTrack(name)) continue;
    // 专辑内歌曲（有 albumMid）无论收藏量都保留；未分类歌曲按收藏量阈值过滤
    const fav = favMap?.[song.songid] || song.favCount || 0;
    if (!shouldKeepByFavOrAlbum({ albumMid: song.albumMid, favCount: fav })) continue;
    const key = baseKey(name);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    filteredSongs.push(song);
  }

  // 种子排位：以 songmid 为去重 key，使用 API 返回顺序（已按热度降序）
  const seedRankByMid = new Map();
  filteredSongs.forEach((song, idx) => {
    if (!seedRankByMid.has(song.songmid)) {
      seedRankByMid.set(song.songmid, idx + 1);
    }
  });

  const allEntrants = filteredSongs.map((song, i) => {
    const sr = seedRankByMid.get(song.songmid) || i + 1;
    // 动态搜索歌手：专辑封面必定不在本地库，直接采用 QQ 音乐 T002 CDN，
    // 避免先 404 同源/jsDelivr 再回退的无效请求链（其他展示组件均读 picLocal 取首图）。
    const qqCover = song.albumMid ? qqCoverUrl(song.albumMid) : '';

    // 从 albumDetails 映射中获取专辑类型和简介
    const albumDetail = albumDetails?.get(song.albumMid);
    // 从 favMap 中获取收藏量
    const fav = favMap?.[song.songid] || 0;

    return {
      name: song.name,
      id: i,
      side: i < filteredSongs.length / 2 ? 'L' : 'R',
      seed: sr,
      nid: null,
      songmid: song.songmid,
      songid: song.songid,
      pic: qqCover,
      picLocal: qqCover,
      songPic: qqCover,
      albumMid: song.albumMid,
      albumName: song.albumName,
      albumDate: song.albumDate || '',
      albumType: albumDetail?.albumType || '',
      albumDesc: albumDetail?.albumDesc || '',
      chorus: null,
      seedRank: sr,
      isSeed: sr <= Math.min(32, filteredSongs.length),
      itunesPreviewUrl: '',
      itunesTrackUrl: '',
      favCount: fav,
    };
  });

  return {
    name: raw.singerName || '动态歌手',
    nameEn: 'QQ',
    bracketSize: computeBracketSize(allEntrants.length),
    entrants: allEntrants,
    seeds: allEntrants.map((_, i) => i),
    seedRank: Object.fromEntries(allEntrants.map((e, i) => [i, e.seedRank])),
    singerPhoto: singerPhotoUrl(raw.singermid),
    source: 'dynamic',
  };
}

const SEARCH_DEBOUNCE_MS = 300;
const ALBUM_FETCH_CONCURRENCY = 4;
const ALBUM_FETCH_BATCH = 5;
const ALBUM_FETCH_CAP = 60;

// 酷狗热度：最多查询前 KUGOU_FETCH_CAP 首（128 强 + 余量），避免几百首歌耗时过长
const KUGOU_FETCH_CAP = 160;

/**
 * 按酷狗热度对 entrants 重新排序并重建种子结构。
 * 已查到热度的歌曲按 owner 降序排在前面；未查到（含未查询的）按原 API 顺序靠后保持稳定。
 * @param {Array} entrants
 * @param {Map<string, {owner: number, heat: number}>} heatMap - songmid -> 热度
 * @param {Map<string, number>} origIdx - songmid -> 原数组索引（稳定 tiebreaker）
 * @returns {Array} 新 entrants（已重排并更新 seed/seedRank/isSeed/side）
 */
function resortByKugouHeat(entrants, heatMap, origIdx) {
  const ranked = entrants.map((e) => {
    const heat = e.songmid ? heatMap.get(e.songmid) : null;
    return { e, owner: heat ? heat.owner : -1, orig: origIdx.get(e.songmid) ?? 0 };
  });
  ranked.sort((a, b) => {
    // 有热度的在前（owner 降序），无热度的按原顺序沉底
    if (a.owner >= 0 && b.owner >= 0) return b.owner - a.owner || a.orig - b.orig;
    if (a.owner >= 0) return -1;
    if (b.owner >= 0) return 1;
    return a.orig - b.orig;
  });
  return ranked.map(({ e }, i) => {
    const sr = i + 1;
    return {
      ...e,
      seedRank: sr,
      isSeed: sr <= Math.min(32, entrants.length),
      side: i < entrants.length / 2 ? 'L' : 'R',
      kugouOwnerCount: e.songmid ? (heatMap.get(e.songmid)?.owner || 0) : 0,
      kugouHeatLevel: e.songmid ? (heatMap.get(e.songmid)?.heat || 0) : 0,
    };
  });
}

/**
 * 动态歌手搜索与加载 hook。
 *
 * @returns {{
 *   searchKeyword: string,
 *   setSearchKeyword: (v: string) => void,
 *   searchResults: Array<{name, mid, photo}>,
 *   isSearching: boolean,
 *   dynamicSinger: {name, mid, photo}|null,
 *   isLoadingSinger: boolean,
 *   loadingProgress: string,
 *   loadSinger: (singer: {name, mid, photo}) => void,
 *   dynamicSingerData: object|null,
 *   clearDynamicSinger: () => void,
 * }}
 */
export function useDynamicSinger() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dynamicSinger, setDynamicSinger] = useState(null);
  const [isLoadingSinger, setIsLoadingSinger] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [dynamicSingerData, setDynamicSingerData] = useState(null);

  // 取消令牌：loadSinger / clearDynamicSinger 时自增，使旧 in-flight 加载失效
  const loadTokenRef = useRef(0);
  const searchTimerRef = useRef(null);
  // 搜索 ID：防止旧搜索结果覆盖新搜索结果
  const searchIdRef = useRef(0);

  // ---------- 防抖搜索（300ms）----------
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    const kw = searchKeyword.trim();
    if (!kw) {
      searchIdRef.current++; // 使任何 in-flight 搜索失效
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const mySearchId = ++searchIdRef.current;
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchSingers(kw);
        // 只接受最新一次搜索的结果
        if (searchIdRef.current !== mySearchId) return;
        setSearchResults(results);
      } catch {
        if (searchIdRef.current !== mySearchId) return;
        setSearchResults([]);
      } finally {
        if (searchIdRef.current !== mySearchId) return;
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [searchKeyword]);

  // ---------- 后台拉取专辑详情，渐进式更新歌手数据 ----------
  const fetchAlbumDetailsInBackground = useCallback(
    (data, myToken) => {
      const uniqueAlbumMids = Array.from(
        new Set(data.entrants.map((e) => e.albumMid).filter(Boolean)),
      ).slice(0, ALBUM_FETCH_CAP);

      if (uniqueAlbumMids.length === 0) return;

      let nextIdx = 0;
      const pending = new Map(); // albumMid -> {albumType, albumDesc}

      const flush = () => {
        if (pending.size === 0) return;
        if (loadTokenRef.current !== myToken) return;
        const updates = new Map(pending);
        pending.clear();
        setDynamicSingerData((prev) => {
          if (!prev) return prev;
          let changed = false;
          const entrants = prev.entrants.map((e) => {
            const u = updates.get(e.albumMid);
            if (u) {
              changed = true;
              return {
                ...e,
                albumType: u.albumType || e.albumType,
                albumDesc: u.albumDesc || e.albumDesc,
              };
            }
            return e;
          });
          return changed ? { ...prev, entrants } : prev;
        });
      };

      const worker = async () => {
        while (true) {
          const i = nextIdx++;
          if (i >= uniqueAlbumMids.length) break;
          if (loadTokenRef.current !== myToken) return;
          const mid = uniqueAlbumMids[i];
          try {
            const detail = await fetchAlbumDetail(mid);
            if (loadTokenRef.current !== myToken) return;
            pending.set(mid, {
              albumType: detail.albumType || '',
              albumDesc: detail.desc || '',
            });
          } catch {
            /* 忽略单张专辑失败 */
          }
          if (pending.size >= ALBUM_FETCH_BATCH) flush();
        }
      };

      Promise.all(
        Array.from({ length: ALBUM_FETCH_CONCURRENCY }, () => worker()),
      ).then(() => {
        if (loadTokenRef.current === myToken) flush();
      });
    },
    [],
  );

  // ---------- 后台拉取酷狗热度，渐进式重排种子位 ----------
  const fetchKugouHeatInBackground = useCallback((data, myToken) => {
    if (!data.entrants.length) return;

    const songmids = Array.from(
      new Set(data.entrants.map((e) => e.songmid).filter(Boolean)),
    );
    if (songmids.length === 0) return;

    // 稳定 tiebreaker：原 API 索引（已按热度排序）
    const origIdx = new Map();
    data.entrants.forEach((e, i) => {
      if (e.songmid) origIdx.set(e.songmid, i);
    });

    const heatMap = new Map();
    const songByMid = new Map();
    data.entrants.forEach((e) => {
      if (e.songmid) songByMid.set(e.songmid, e);
    });

    const flush = () => {
      if (loadTokenRef.current !== myToken) return;
      setDynamicSingerData((prev) => {
        if (!prev) return prev;
        const next = resortByKugouHeat(prev.entrants, heatMap, origIdx);
        return {
          ...prev,
          entrants: next,
          seeds: next.map((_, i) => i),
          seedRank: Object.fromEntries(next.map((e, i) => [i, e.seedRank])),
        };
      });
    };

    const entries = songmids
      .slice(0, KUGOU_FETCH_CAP)
      .map((mid) => songByMid.get(mid));

    fetchKugouHeatBatch(data.name, entries, {
      max: KUGOU_FETCH_CAP,
      onEntry: (song, heat) => {
        if (song.songmid) heatMap.set(song.songmid, heat);
      },
      onProgress: (done, total) => {
        if (loadTokenRef.current !== myToken) return;
        if (done % 10 === 0 || done === total) flush();
      },
    })
      .then(() => {
        if (loadTokenRef.current === myToken) flush();
      })
      .catch(() => {
        if (loadTokenRef.current === myToken) flush();
      });
  }, []);

  // ---------- 加载歌手歌曲 ----------
  const loadSinger = useCallback(
    async (singer) => {
      if (!singer || !singer.mid) return;
      // 已加载同一歌手则不重复拉取
      if (dynamicSinger?.mid === singer.mid && dynamicSingerData) return;

      const myToken = ++loadTokenRef.current;
      searchIdRef.current++; // 取消待处理的搜索
      setDynamicSinger(singer);
      setIsLoadingSinger(true);
      setLoadingProgress('加载中…');
      setSearchResults([]);
      setSearchKeyword('');
      setIsSearching(false);
      setDynamicSingerData(null);

      try {
        const { songs, singerName, singermid } = await fetchSingerSongs(
          singer.mid,
          (p) => {
            if (loadTokenRef.current === myToken) setLoadingProgress(p);
          },
        );
        if (loadTokenRef.current !== myToken) return;

        const data = transformDynamicSingerData({ songs, singerName, singermid });
        if (loadTokenRef.current !== myToken) return;

        if (data.entrants.length === 0) {
          setLoadingProgress('未找到可用歌曲');
          setIsLoadingSinger(false);
          return;
        }

        setDynamicSingerData(data);
        setIsLoadingSinger(false);
        setLoadingProgress('');

        // 后台异步拉取专辑详情，到位后渐进式更新
        fetchAlbumDetailsInBackground(data, myToken);
        // 后台异步拉取酷狗热度，到位后渐进式重排种子位
        fetchKugouHeatInBackground(data, myToken);
      } catch {
        if (loadTokenRef.current === myToken) {
          setIsLoadingSinger(false);
          setLoadingProgress('加载失败，请重试');
        }
      }
    },
    [dynamicSinger, dynamicSingerData, fetchAlbumDetailsInBackground, fetchKugouHeatInBackground],
  );

  // ---------- 清除动态歌手 ----------
  const clearDynamicSinger = useCallback(() => {
    loadTokenRef.current++; // 取消所有 in-flight 加载
    searchIdRef.current++; // 取消所有 in-flight 搜索
    setDynamicSinger(null);
    setDynamicSingerData(null);
    setIsLoadingSinger(false);
    setLoadingProgress('');
    setSearchKeyword('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  return {
    searchKeyword,
    setSearchKeyword,
    searchResults,
    isSearching,
    dynamicSinger,
    isLoadingSinger,
    loadingProgress,
    loadSinger,
    dynamicSingerData,
    clearDynamicSinger,
  };
}

export default useDynamicSinger;
