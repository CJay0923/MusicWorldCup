// src/hooks/useMultiSingerData.js
// 跨歌手模式：并行加载多位内置歌手数据，复用 useSingerData 的模块级缓存
import { useState, useEffect, useRef } from 'react';
import { loadSingerData } from './useSingerData.js';
import { STATIC_SINGERS } from '../data/singers.js';

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
    if (ids.length === 0) { setDataMap({}); setLoading(false); setLoadingCount(0); return; }
    let cancelled = false;
    setLoading(true);
    setLoadingCount(ids.length);
    Promise.all(
      ids.map((id) => loadSingerData(id).then((data) => ({ id, data: data || STATIC_SINGERS[id] || null }))),
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      for (const r of results) { if (r.data) map[r.id] = r.data; }
      setDataMap(map);
      setLoading(false);
      setLoadingCount(0);
    });
    return () => { cancelled = true; };
  }, [singerIds]);

  return { dataMap, loading, loadingCount };
}

export default useMultiSingerData;
