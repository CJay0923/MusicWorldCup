// src/hooks/useMultiSingerData.js
// 跨歌手模式：并行加载多位内置歌手数据，复用 useSingerData 的模块级缓存

import { useState, useEffect, useRef } from 'react';
import { loadSingersBatch } from './useSingerData.js';

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

    // 一次性批量拉取整组（后端 IN 子句，3N 次 D1 读塌缩为 3 次）
    (async () => {
      const map = await loadSingersBatch(ids);
      if (cancelled) return;
      setDataMap(map);
      setLoading(false);
      setLoadingCount(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [singerIds]);

  return { dataMap, loading, loadingCount };
}
