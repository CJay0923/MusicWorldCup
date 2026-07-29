// src/hooks/useMultiSingerData.js
// 跨歌手模式：并行加载多位内置歌手数据，复用 useSingerData 的模块级缓存

import { useState, useEffect, useRef } from 'react';
import { loadSingerData } from './useSingerData.js';
import { STATIC_SINGERS } from '../data/singers.js';

/**
 * 并行加载多位歌手数据
 * @param {string[]} singerIds - 歌手 ID 数组
 * @returns {{dataMap: Object<string, object>, loading: boolean, loadingCount: number}}
 */
export function useMultiSingerData(singerIds) {
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const lastIdsRef = useRef('');

  useEffect(() => {
    const ids = singerIds || [];
    const key = ids.slice().sort().join(',');
    if (key === lastIdsRef.current) return;
    lastIdsRef.current = key;

    if (ids.length === 0) {
      setDataMap({});
      setLoading(false);
      setLoadingCount(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadingCount(ids.length);

    // 串行加载每位歌手，避免多个同步 transformToSingerData 叠加阻塞主线程
    // 每位歌手加载完即更新 dataMap（增量更新）
    (async () => {
      const map = {};
      for (const id of ids) {
        if (cancelled) return;
        const data = await loadSingerData(id);
        if (data) map[id] = data;
        setLoadingCount(ids.length - Object.keys(map).length);
        // 增量更新（已加载的先显示）
        if (!cancelled) setDataMap({ ...map });
      }
      if (!cancelled) {
        setLoading(false);
        setLoadingCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [singerIds]);

  return { dataMap, loading, loadingCount };
}
