// src/hooks/useCrossSingerSearch.js
// 跨歌手模式：搜索额外歌手并加载其歌曲数据
// 复用 qqMusic.js 的搜索和拉取逻辑，支持同时加载多位动态歌手

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  searchSingers,
  fetchSingerSongs,
  fetchAlbumDetailsBatch,
  fetchSongFavCounts,
} from '../lib/qqMusic.js';
import { transformDynamicSingerData } from './useDynamicSinger.js';

const SEARCH_DEBOUNCE_MS = 300;
const ALBUM_FETCH_CAP = 50;
const FAV_FETCH_CAP = 300;

/**
 * 跨歌手搜索 hook
 * 管理搜索状态和动态歌手数据加载
 *
 * @returns {{
 *   searchKeyword: string,
 *   setSearchKeyword: (v: string) => void,
 *   searchResults: Array<{name, mid, photo}>,
 *   isSearching: boolean,
 *   dynamicSingers: Map<string, {name, mid, photo, data}>,
 *   loadingMids: Set<string>,
 *   addDynamicSinger: (singer: {name, mid, photo}) => Promise<void>,
 *   removeDynamicSinger: (mid: string) => void,
 *   getDynamicSingerData: (mid: string) => object|null,
 * }}
 */
export function useCrossSingerSearch() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dynamicSingers, setDynamicSingers] = useState(new Map());
  const [loadingMids, setLoadingMids] = useState(new Set());

  const searchTimerRef = useRef(null);
  const searchIdRef = useRef(0);
  const loadTokenRef = useRef(0);

  // ---------- 防抖搜索 ----------
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    const kw = searchKeyword.trim();
    if (!kw) {
      searchIdRef.current++;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const mySearchId = ++searchIdRef.current;
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchSingers(kw);
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

  // ---------- 加载动态歌手数据 ----------
  const addDynamicSinger = useCallback(async (singer) => {
    if (!singer || !singer.mid) return;
    // 已加载则跳过
    if (dynamicSingers.has(singer.mid)) return;

    const myToken = ++loadTokenRef.current;
    setLoadingMids((prev) => new Set(prev).add(singer.mid));

    try {
      // 1. 拉取歌曲列表
      const { songs, singerName, singermid } = await fetchSingerSongs(singer.mid);
      if (loadTokenRef.current !== myToken) return;
      if (!songs || songs.length === 0) return;

      // 2. 拉取专辑详情
      const uniqueAlbumMids = Array.from(
        new Set(songs.map((s) => s.albumMid).filter(Boolean)),
      ).slice(0, ALBUM_FETCH_CAP);
      let albumDetails = new Map();
      if (uniqueAlbumMids.length > 0) {
        albumDetails = await fetchAlbumDetailsBatch(uniqueAlbumMids, null, 4);
        if (loadTokenRef.current !== myToken) return;
      }

      // 3. 拉取收藏量
      const songIds = songs.map((s) => s.songid).filter((id) => id > 0).slice(0, FAV_FETCH_CAP);
      let favMap = {};
      if (songIds.length > 0) {
        favMap = await fetchSongFavCounts(songIds);
        if (loadTokenRef.current !== myToken) return;
      }

      // 4. 转换数据
      const data = transformDynamicSingerData(
        { songs, singerName, singermid },
        albumDetails,
        favMap,
      );
      if (loadTokenRef.current !== myToken) return;
      if (data.entrants.length === 0) return;

      setDynamicSingers((prev) => {
        const next = new Map(prev);
        next.set(singer.mid, {
          name: singerName || singer.name,
          mid: singer.mid,
          photo: singer.photo,
          data,
        });
        return next;
      });
    } catch {
      // 加载失败，静默处理
    } finally {
      setLoadingMids((prev) => {
        const next = new Set(prev);
        next.delete(singer.mid);
        return next;
      });
    }
  }, [dynamicSingers]);

  // ---------- 移除动态歌手 ----------
  const removeDynamicSinger = useCallback((mid) => {
    setDynamicSingers((prev) => {
      const next = new Map(prev);
      next.delete(mid);
      return next;
    });
  }, []);

  // ---------- 获取动态歌手数据 ----------
  const getDynamicSingerData = useCallback((mid) => {
    const entry = dynamicSingers.get(mid);
    return entry?.data || null;
  }, [dynamicSingers]);

  return {
    searchKeyword,
    setSearchKeyword,
    searchResults,
    isSearching,
    dynamicSingers,
    loadingMids,
    addDynamicSinger,
    removeDynamicSinger,
    getDynamicSingerData,
  };
}

export default useCrossSingerSearch;
