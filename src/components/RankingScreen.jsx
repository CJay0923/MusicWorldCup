import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { buildRankingTiers } from '../data/singers.js';

/**
 * 夯到拉排名模式 — 拖拉式 Tier List 交互
 * 用户将歌曲/专辑/歌手从底部"待分类"区域拖拽到对应等级行：
 * 夯 → 顶级 → 人上人 → NPC → 拉完了
 *
 * 交互方式：
 *   - 按住项目卡片拖拽到目标等级行
 *   - 可在等级之间自由移动
 *   - 可拖回"待分类"区域
 *   - 支持鼠标和触摸（pointer events）
 *
 * @param {object[]} items - 待排名的项目数组（已洗牌）
 * @param {string} category - 'song' | 'album' | 'singer'
 * @param {string} singerName - 歌手名称（用于显示）
 * @param {() => void} onReset - 返回重置
 */

// 标准夯到拉等级描述（参考 1ktools / 哈基榜 / 掘金等同类网站）
const TIER_DESCRIPTIONS = [
  '天花板，强到无需多言',
  '标杆水平，几乎没有瑕疵',
  '中上游，性价比高',
  '平庸无奇，中规中矩',
  '垫底，体验极差',
];

// 获取项目唯一标识用于 key
function itemKey(item) {
  return item.songmid || item.id || item.name + (item.singerName || '');
}

export default function RankingScreen({ items, category, singerName, onReset }) {
  const tierData = useMemo(() => {
    if (!items || items.length === 0) return null;
    return buildRankingTiers(items.length);
  }, [items]);

  const tiers = tierData?.tiers || [];

  // 统一状态：各等级已分配 + 待分类池
  const [state, setState] = useState(() => ({
    assignments: tiers.map(() => []),
    pool: items ? [...items] : [],
  }));

  const [showResult, setShowResult] = useState(false);
  const [dragVisual, setDragVisual] = useState(null); // 渲染 ghost 用
  const [dropTarget, setDropTarget] = useState(null); // 当前高亮的放置区
  const [dragActive, setDragActive] = useState(false);

  // ref 存储拖拽数据（避免 useEffect 闭包过时）
  const dragRef = useRef(null);
  const moveItemRef = useRef(null);
  const stateRef = useRef(state);
  const tiersRef = useRef(tiers);

  stateRef.current = state;
  tiersRef.current = tiers;

  const allAssigned = state.pool.length === 0;
  const totalAssigned = items.length - state.pool.length;

  // ---------- 封面图获取 ----------
  const getItemArt = useCallback((item) => {
    if (!item) return '';
    if (category === 'album') return item.pic || '';
    if (category === 'singer') return item.photo || '';
    // song
    const t062 = item.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${item.songmid}.jpg`
      : '';
    const t002 = item.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${item.albumMid}.jpg`
      : '';
    return item.songPic || item.pic || t062 || t002 || '';
  }, [category]);

  const handleArtError = useCallback((e, item) => {
    const img = e.currentTarget;
    const tried = img.dataset.tried || '';
    const t062 = item.songmid
      ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${item.songmid}.jpg`
      : '';
    const t002 = item.albumMid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${item.albumMid}.jpg`
      : '';
    if (tried !== 't062' && t062) { img.dataset.tried = 't062'; img.src = t062; return; }
    if (tried !== 't002' && t002) { img.dataset.tried = 't002'; img.src = t002; return; }
    img.style.display = 'none';
  }, []);

  // ---------- 移动项目 ----------
  const moveItem = useCallback((from, toType, toIndex) => {
    setState((prev) => {
      const t = tiersRef.current;
      // 容量检查：目标等级已满且不是同一等级
      if (toType === 'tier') {
        const isSameTier = from.type === 'tier' && from.tierIndex === toIndex;
        if (!isSameTier && prev.assignments[toIndex].length >= t[toIndex].count) {
          return prev; // 已满，不允许
        }
      }
      const next = {
        assignments: prev.assignments.map((a) => [...a]),
        pool: [...prev.pool],
      };
      // 从源移除
      let item;
      if (from.type === 'tier') {
        item = next.assignments[from.tierIndex][from.itemIndex];
        next.assignments[from.tierIndex].splice(from.itemIndex, 1);
      } else {
        item = next.pool[from.itemIndex];
        next.pool.splice(from.itemIndex, 1);
      }
      // 添加到目标
      if (toType === 'tier') {
        next.assignments[toIndex].push(item);
      } else {
        next.pool.push(item);
      }
      return next;
    });
  }, []);

  moveItemRef.current = moveItem;

  // ---------- 开始拖拽 ----------
  const onItemPointerDown = useCallback((e, item, fromType, tierIndex, itemIndex) => {
    // 仅左键或触摸
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      item,
      from: { type: fromType, tierIndex, itemIndex },
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    setDragVisual({ ...dragRef.current });
    setDragActive(true);
  }, []);

  // ---------- 拖拽中 / 释放 ----------
  useEffect(() => {
    if (!dragActive) return;

    const handleMove = (e) => {
      if (!dragRef.current) return;
      e.preventDefault();
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;
      setDragVisual({ ...dragRef.current });

      // 检测放置目标
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zone = el?.closest('[data-drop-zone]');
      if (zone) {
        const target = zone.dataset.dropZone;
        if (target !== 'pool') {
          const tierIdx = parseInt(target);
          const s = stateRef.current;
          const t = tiersRef.current;
          const isSameTier =
            dragRef.current.from.type === 'tier' &&
            dragRef.current.from.tierIndex === tierIdx;
          if (!isSameTier && s.assignments[tierIdx].length >= t[tierIdx].count) {
            setDropTarget(null); // 已满不高亮
            return;
          }
        }
        setDropTarget(target);
      } else {
        setDropTarget(null);
      }
    };

    const handleUp = (e) => {
      if (!dragRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zone = el?.closest('[data-drop-zone]');
      if (zone) {
        const target = zone.dataset.dropZone;
        if (target === 'pool') {
          moveItemRef.current?.(dragRef.current.from, 'pool', -1);
        } else {
          moveItemRef.current?.(dragRef.current.from, 'tier', parseInt(target));
        }
      }
      dragRef.current = null;
      setDragVisual(null);
      setDropTarget(null);
      setDragActive(false);
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragActive]);

  // ---------- 便捷操作 ----------
  const autoAssign = useCallback(() => {
    setState((prev) => {
      const t = tiersRef.current;
      const next = {
        assignments: prev.assignments.map((a) => [...a]),
        pool: [...prev.pool],
      };
      // 打乱 pool
      for (let i = next.pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next.pool[i], next.pool[j]] = [next.pool[j], next.pool[i]];
      }
      // 依次填入有空位的等级
      let poolIdx = 0;
      for (let ti = 0; ti < t.length && poolIdx < next.pool.length; ti++) {
        while (next.assignments[ti].length < t[ti].count && poolIdx < next.pool.length) {
          next.assignments[ti].push(next.pool[poolIdx]);
          poolIdx++;
        }
      }
      next.pool = next.pool.slice(poolIdx);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setState({
      assignments: tiersRef.current.map(() => []),
      pool: items ? [...items] : [],
    });
    setShowResult(false);
  }, [items]);

  const shufflePool = useCallback(() => {
    setState((prev) => {
      const pool = [...prev.pool];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return { ...prev, pool };
    });
  }, []);

  const categoryLabel = category === 'song' ? '歌曲' : category === 'album' ? '专辑' : '歌手';

  // ---------- 空状态 ----------
  if (!items || items.length === 0) {
    return (
      <div className="ranking-dd-screen">
        <p className="ranking-dd-empty-msg">没有可排名的项目</p>
        <button className="btn" type="button" onClick={onReset}>返回</button>
      </div>
    );
  }

  // ---------- 项目卡片渲染 ----------
  const renderItem = (item, fromType, tierIndex, itemIndex) => {
    const isDragging =
      dragVisual?.from?.type === fromType &&
      dragVisual?.from?.tierIndex === tierIndex &&
      dragVisual?.from?.itemIndex === itemIndex;
    const art = getItemArt(item);
    return (
      <div
        key={itemKey(item)}
        className={clsx('ranking-dd-item', { dragging: isDragging })}
        onPointerDown={(e) => onItemPointerDown(e, item, fromType, tierIndex, itemIndex)}
      >
        {art ? (
          <img src={art} alt="" loading="lazy" draggable={false} onError={(e) => handleArtError(e, item)} />
        ) : (
          <div className="ranking-dd-item-noart">
            {category === 'singer' ? '🎤' : '🎵'}
          </div>
        )}
        <span className="ranking-dd-item-name">{item.name}</span>
      </div>
    );
  };

  // ---------- 结果展示 ----------
  if (showResult || allAssigned) {
    return (
      <div className="ranking-result">
        <div className="ranking-result-header">
          <h2>🏆 {singerName} {categoryLabel}夯到拉排名</h2>
          <p>共 {items.length} 个{categoryLabel}已排名完成</p>
        </div>
        <div className="ranking-tiers">
          {tiers.map((tier, i) => (
            <div key={i} className={clsx('ranking-tier-row', `tier-${i}`)}>
              <div className="ranking-tier-label">
                {tier.label}
                <small className="ranking-tier-desc">{TIER_DESCRIPTIONS[i]}</small>
              </div>
              <div className="ranking-tier-items">
                {state.assignments[i].length === 0 ? (
                  <span className="ranking-tier-empty">（空）</span>
                ) : (
                  state.assignments[i].map((item, j) => (
                    <div key={itemKey(item)} className="ranking-tier-item">
                      {getItemArt(item) ? (
                        <img src={getItemArt(item)} alt="" loading="lazy"
                             onError={(e) => handleArtError(e, item)} />
                      ) : (
                        <div className="ranking-tier-noart">🎵</div>
                      )}
                      <span>{item.name}</span>
                      {item.singerName && category !== 'singer' && (
                        <small>{item.singerName}</small>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="ranking-tier-count">{state.assignments[i].length}/{tier.count}</div>
            </div>
          ))}
        </div>
        <div className="ranking-actions">
          <button className="btn primary" type="button" onClick={() => setShowResult(false)}>
            ↩ 重新调整
          </button>
          <button className="btn" type="button" onClick={onReset}>
            ↺ 重新开始
          </button>
        </div>
      </div>
    );
  }

  // ---------- 拖拉式排名界面 ----------
  const progress = Math.round((totalAssigned / items.length) * 100);

  return (
    <div className="ranking-dd-screen">
      {/* 头部 */}
      <div className="ranking-dd-header">
        <h2>📊 夯到拉排名 · {categoryLabel}</h2>
        <div className="ranking-dd-progress">
          <div className="ranking-dd-progress-bar">
            <div className="ranking-dd-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ranking-dd-progress-text">
            {totalAssigned} / {items.length}
          </span>
        </div>
        <p className="ranking-dd-hint">👆 长按拖拽项目到对应等级</p>
      </div>

      {/* 等级行 */}
      <div className="ranking-dd-tiers">
        {tiers.map((tier, i) => {
          const remaining = tier.count - state.assignments[i].length;
          const isFull = remaining <= 0;
          const isActive = dropTarget === String(i);
          return (
            <div
              key={i}
              data-drop-zone={String(i)}
              className={clsx('ranking-dd-tier', `tier-${i}`, {
                'drop-active': isActive,
                full: isFull,
              })}
            >
              <div className="ranking-dd-tier-label-section">
                <span className="ranking-dd-tier-label">{tier.label}</span>
                <small className="ranking-dd-tier-desc">{TIER_DESCRIPTIONS[i]}</small>
                <span className="ranking-dd-tier-count">
                  {state.assignments[i].length}/{tier.count}
                </span>
              </div>
              <div className="ranking-dd-tier-items">
                {state.assignments[i].map((item, j) =>
                  renderItem(item, 'tier', i, j),
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 待分类池 */}
      <div
        data-drop-zone="pool"
        className={clsx('ranking-dd-pool', { 'drop-active': dropTarget === 'pool' })}
      >
        <div className="ranking-dd-pool-header">
          <span className="ranking-dd-pool-title">
            📦 待分类 ({state.pool.length})
          </span>
          <div className="ranking-dd-pool-actions">
            <button
              className="btn ghost small"
              type="button"
              onClick={shufflePool}
              disabled={state.pool.length < 2}
            >
              🔀 洗牌
            </button>
            <button
              className="btn ghost small"
              type="button"
              onClick={autoAssign}
              disabled={state.pool.length === 0}
            >
              ⚡ 自动分配
            </button>
          </div>
        </div>
        <div className="ranking-dd-pool-items">
          {state.pool.length === 0 ? (
            <div className="ranking-dd-pool-empty">
              ✅ 全部分类完成！点击下方查看排名
            </div>
          ) : (
            state.pool.map((item, j) =>
              renderItem(item, 'pool', -1, j),
            )
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="ranking-dd-actions">
        <button className="btn ghost" type="button" onClick={resetAll}>
          ↺ 全部重置
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={() => setShowResult(true)}
          disabled={totalAssigned === 0}
        >
          📋 查看排名
        </button>
      </div>

      {/* 拖拽 ghost */}
      {dragVisual && (
        <div
          className="ranking-dd-ghost"
          style={{
            left: dragVisual.x - dragVisual.offsetX,
            top: dragVisual.y - dragVisual.offsetY,
            width: dragVisual.width,
          }}
        >
          {getItemArt(dragVisual.item) ? (
            <img src={getItemArt(dragVisual.item)} alt="" draggable={false} />
          ) : (
            <div className="ranking-dd-item-noart">
              {category === 'singer' ? '🎤' : '🎵'}
            </div>
          )}
          <span>{dragVisual.item.name}</span>
        </div>
      )}
    </div>
  );
}
