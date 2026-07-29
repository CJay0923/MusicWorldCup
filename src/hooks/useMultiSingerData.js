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

    // 并行 fetch + transform（loadSingerData 内部有缓存和去重）
    // 每位歌手加载完即增量更新 dataMap
    (async () => {
      const map = {};
      const promises = ids.map(async (id) => {
        const data = await loadSingerData(id);
        if (cancelled) return;
        if (data) {
          map[id] = data;
          setLoadingCount(ids.length - Object.keys(map).length);
          setDataMap({ ...map });
        }
      });
      await Promise.all(promises);
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
