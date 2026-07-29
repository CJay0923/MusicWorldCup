import React, { useState, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { buildRankingTiers } from '../data/singers.js';

/**
 * 夯到拉排名模式
 * 用户将歌曲/专辑/歌手逐个分配到 5 个等级：
 * 夯 → 顶级 → 人上人 → NPC → 拉完了
 * 夯的个数 = floor(total/8) + 1，其余等级曲线递增，拉完了最多
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
export default function RankingScreen({ items, category, singerName, onReset }) {
  const { tiers } = useMemo(() => buildRankingTiers(items.length), [items.length]);

  // 每层的已分配项目
  const [assignments, setAssignments] = useState(() => tiers.map(() => []));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const scrollRef = useRef(null);

  const currentItem = items[currentIdx];
  const isDone = currentIdx >= items.length;

  // 每层剩余容量
  const tierRemaining = useMemo(
    () => tiers.map((t, i) => t.count - assignments[i].length),
    [tiers, assignments],
  );

  // 分配当前项目到指定层级
  const assignTier = useCallback(
    (tierIdx) => {
      if (isDone) return;
      if (tierRemaining[tierIdx] <= 0) return;

      setAssignments((prev) => {
        const next = prev.map((a) => [...a]);
        next[tierIdx].push(currentItem);
        return next;
      });
      setCurrentIdx((prev) => prev + 1);

      // 滚动到顶部
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    },
    [isDone, tierRemaining, currentItem],
  );

  // 撤销上一个
  const undo = useCallback(() => {
    if (currentIdx === 0) return;
    setAssignments((prev) => {
      const next = prev.map((a) => [...a]);
      // 找到最后一个被分配的项目
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].length > 0) {
          next[i].pop();
          break;
        }
      }
      return next;
    });
    setCurrentIdx((prev) => prev - 1);
  }, [currentIdx]);

  // 获取项目的封面图
  const getItemArt = useCallback((item) => {
    if (category === 'album') {
      return item.pic || '';
    }
    if (category === 'singer') {
      return item.photo || '';
    }
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

  const categoryLabel = category === 'song' ? '歌曲' : category === 'album' ? '专辑' : '歌手';

  // ---------- 结果展示 ----------
  if (showResult || isDone) {
    return (
      <div className="ranking-result">
        <div className="ranking-result-header">
          <h2>🏆 {singerName} {categoryLabel}夯到拉排名</h2>
          <p>共 {items.length} 个{categoryLabel}已排名完成</p>
        </div>
        <div className="ranking-tiers" ref={scrollRef}>
          {tiers.map((tier, i) => (
            <div key={i} className={clsx('ranking-tier-row', `tier-${i}`)}>
              <div className="ranking-tier-label">
                {tier.label}
                <small className="ranking-tier-desc">{TIER_DESCRIPTIONS[i]}</small>
              </div>
              <div className="ranking-tier-items">
                {assignments[i].length === 0 ? (
                  <span className="ranking-tier-empty">（空）</span>
                ) : (
                  assignments[i].map((item, j) => (
                    <div key={j} className="ranking-tier-item">
                      {getItemArt(item) ? (
                        <img
                          src={getItemArt(item)}
                          alt=""
                          loading="lazy"
                          onError={(e) => handleArtError(e, item)}
                        />
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
              <div className="ranking-tier-count">{assignments[i].length}/{tier.count}</div>
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

  // ---------- 排名进行中 ----------
  const progress = Math.round((currentIdx / items.length) * 100);

  return (
    <div className="ranking-screen" ref={scrollRef}>
      <div className="ranking-header">
        <h2>📊 夯到拉排名 · {categoryLabel}</h2>
        <div className="ranking-progress-bar">
          <div className="ranking-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="ranking-progress-text">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      {/* 层级容量预览 */}
      <div className="tier-capacity-preview">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className={clsx('tier-cap-chip', `tier-${i}`, {
              full: tierRemaining[i] <= 0,
            })}
          >
            <span className="tier-cap-label">{tier.label}</span>
            <span className="tier-cap-desc">{TIER_DESCRIPTIONS[i]}</span>
            <span className="tier-cap-count">
              {assignments[i].length}/{tier.count}
            </span>
          </div>
        ))}
      </div>

      {/* 当前项目卡片 */}
      {currentItem && (
        <div className="ranking-current-card">
          <div className="ranking-current-art">
            {getItemArt(currentItem) ? (
              <img
                src={getItemArt(currentItem)}
                alt=""
                onError={(e) => handleArtError(e, currentItem)}
              />
            ) : (
              <div className="ranking-current-noart">
                {category === 'singer' ? '🎤' : '🎵'}
              </div>
            )}
          </div>
          <div className="ranking-current-name">{currentItem.name}</div>
          {currentItem.singerName && category !== 'singer' && (
            <div className="ranking-current-singer">{currentItem.singerName}</div>
          )}
          {currentItem.albumName && category === 'song' && (
            <div className="ranking-current-album">{currentItem.albumName}</div>
          )}
        </div>
      )}

      {/* 层级选择按钮 */}
      <div className="tier-buttons">
        {tiers.map((tier, i) => (
          <button
            key={i}
            className={clsx('tier-btn', `tier-${i}`, {
              disabled: tierRemaining[i] <= 0,
            })}
            onClick={() => assignTier(i)}
            disabled={tierRemaining[i] <= 0}
            type="button"
          >
            <div className="tier-btn-left">
              <span className="tier-btn-label">{tier.label}</span>
              <span className="tier-btn-desc">{TIER_DESCRIPTIONS[i]}</span>
            </div>
            <span className="tier-btn-remaining">
              {tierRemaining[i] > 0 ? `剩 ${tierRemaining[i]}` : '已满'}
            </span>
          </button>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="ranking-actions">
        <button
          className="btn ghost"
          type="button"
          onClick={undo}
          disabled={currentIdx === 0}
        >
          ↶ 撤销
        </button>
        <button className="btn" type="button" onClick={() => setShowResult(true)}>
          📋 查看当前排名
        </button>
      </div>
    </div>
  );
}
