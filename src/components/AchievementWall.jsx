import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ACHIEVEMENTS, loadStats } from '../utils/playstyle.js';

/**
 * 奖杯墙 — 在首页展示已获得 / 未获得的成就徽章。
 * 0 进度时折叠为单行文字，不预铺空卡片。
 *
 * @param {object} unlocked - { achievementKey: true } 已解锁映射
 */
export default function AchievementWall({ unlocked = {} }) {
  const keys = Object.keys(ACHIEVEMENTS);
  const unlockedCount = keys.filter((k) => unlocked[k]).length;
  const stats = loadStats();
  const [expanded, setExpanded] = useState(false);

  // 0 进度时折叠为单行文字
  if (unlockedCount === 0) {
    return (
      <div className="mx-auto mb-8 max-w-[680px]">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-muted">
          <span>🏅</span>
          <span>成就解锁 <b className="text-ink">0</b> / {keys.length}</span>
          <span className="text-muted">· 完成一届比赛后开始解锁</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-8 max-w-[680px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left">
      {/* 标题行 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-wide text-accent">
          <span>🏅</span>
          <span>成就墙</span>
        </h3>
        <button
          className="text-[12px] font-bold text-muted hover:text-ink transition-colors"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {unlockedCount} / {keys.length} {expanded ? '收起' : '展开'}
        </button>
      </div>

      {/* 战绩统计 — 始终显示 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
        <span>
          🏆 夺冠 <b className="text-ink">{stats.totalChampionships || 0}</b> 次
        </span>
        <span>
          ⚔️ 总场次 <b className="text-ink">{stats.totalMatches || 0}</b>
        </span>
        <span>
          🔥 爆冷 <b className="text-ink">{stats.totalUpsets || 0}</b> 次
        </span>
        {stats.bestTime && (
          <span>
            ⚡ 最快 <b className="text-ink">{Math.round(stats.bestTime / 60)}分{stats.bestTime % 60 || 0}秒</b>
          </span>
        )}
        {stats.mostPlayedSinger && (
          <span>
            🎤 最常玩 <b className="text-ink">{stats.mostPlayedSinger}</b>
          </span>
        )}
      </div>

      {/* 徽章网格 — 默认折叠，点击展开 */}
      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-4">
          {keys.map((key) => {
            const ach = ACHIEVEMENTS[key];
            const isUnlocked = !!unlocked[key];
            return (
              <div
                key={key}
                className={clsx(
                  'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200',
                  isUnlocked
                    ? 'border-accent/30 bg-accent/[0.08]'
                    : 'border-white/[0.06] bg-white/[0.02] opacity-45',
                )}
              >
                <span
                  className={clsx(
                    'text-2xl transition-all',
                    isUnlocked ? 'scale-100' : 'grayscale',
                  )}
                >
                  {isUnlocked ? ach.icon : '🔒'}
                </span>
                <span
                  className={clsx(
                    'text-[12px] font-bold leading-tight',
                    isUnlocked ? 'text-ink' : 'text-muted',
                  )}
                >
                  {ach.title}
                </span>
                <span className="text-[10px] leading-tight text-muted">
                  {ach.desc}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
