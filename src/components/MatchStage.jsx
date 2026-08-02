import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import MatchCard from './MatchCard.jsx';
import { computeTension } from '../utils/playstyle.js';

/**
 * Battle stage: two cards + VS marker + tension bar.
 * Dark theme with glowing VS badge.
 *
 * @param {object|null} leftEntrant - left song object
 * @param {object|null} rightEntrant - right song object
 * @param {'default'|'win'|'lose'|'locked'} leftState - left card state
 * @param {'default'|'win'|'lose'|'locked'} rightState - right card state
 * @param {boolean} showSideTag - whether to show half tags on the cards
 * @param {(slot: 0|1) => void} onPick - called with 0 (left) or 1 (right) when a card is picked
 * @param {(slot: 0|1) => void} onPreview - called with 0 (left) or 1 (right) for preview
 * @param {object|null} upsetInfo - { side: 0|1, winner, loser } when an upset just occurred
 * @param {React.ReactNode} children - extra content
 */
export default function MatchStage({
  leftEntrant,
  rightEntrant,
  leftState,
  rightState,
  showSideTag,
  onPick,
  onPreview,
  upsetInfo,
  children,
}) {
  const onPickLeft = useCallback(() => onPick?.(0), [onPick]);
  const onPickRight = useCallback(() => onPick?.(1), [onPick]);
  const onPreviewLeft = useCallback(() => onPreview?.(0), [onPreview]);
  const onPreviewRight = useCallback(() => onPreview?.(1), [onPreview]);

  // 对决张力（0-100）：seedRank 差越小越紧张
  const tension = useMemo(
    () => computeTension(leftEntrant, rightEntrant),
    [leftEntrant, rightEntrant],
  );
  const isHighTension = tension >= 65;
  const isExtremeTension = tension >= 85;

  // 爆冷检测：upsetInfo 非空且当前处于胜负过渡状态
  const showUpsetBanner = !!upsetInfo && (leftState === 'win' || rightState === 'win');

  return (
    <>
      {/* 张力条 */}
      {leftEntrant && rightEntrant && (
        <div className="mb-3 flex items-center gap-2.5">
          <span className="text-[11px] font-bold tracking-wide text-muted">
            张力
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${tension}%`,
                background: isExtremeTension
                  ? 'var(--accent)'
                  : isHighTension
                    ? 'var(--color-side-right)'
                    : 'var(--muted)',
              }}
            />
          </div>
          {isExtremeTension ? (
            <span className="animate-[pulse_1.5s_ease-in-out_infinite] text-[11px] font-extrabold text-accent">
              悬念拉满!
            </span>
          ) : isHighTension ? (
            <span className="text-[11px] font-bold text-side-right">
              势均力敌
            </span>
          ) : null}
        </div>
      )}

      {/* 爆冷横幅 */}
      {showUpsetBanner && (
        <div className="mb-2.5 flex animate-[upsetPop_0.5s_cubic-bezier(0.22,1.4,0.36,1)] justify-center">
          <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5">
            <span className="text-sm">⚠</span>
            <span className="text-[13px] font-bold tracking-wide text-accent">
              爆冷
            </span>
            <span className="text-[11px] text-muted">
              {upsetInfo.winner?.seedRank ?? '?'} 种子击败{' '}
              {upsetInfo.loser?.seedRank ?? '?'} 种子
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-5 max-md:grid-cols-1 max-md:gap-4">
        <MatchCard
          entrant={leftEntrant}
          side="left"
          state={leftState}
          showSideTag={showSideTag}
          isUpsetWin={showUpsetBanner && upsetInfo?.side === 0}
          onPick={onPickLeft}
          onPreview={onPreviewLeft}
        />
        {/* VS 徽章 — 居中发光，高张力时加强脉冲 */}
        <div className="flex min-w-[70px] flex-col items-center justify-center gap-2.5 max-md:flex-row max-md:min-w-0 max-md:py-4">
          <div
            className={clsx(
              'flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-black tracking-wider',
              isHighTension
                ? 'border-accent bg-bg2 text-accent shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
                : 'border-accent/60 bg-bg2 text-accent shadow-[0_4px_12px_rgba(0,0,0,0.2)]',
            )}
          >
            VS
          </div>
          <div className="font-display text-[11px] uppercase tracking-[3px] text-muted max-md:hidden">
            VERSUS
          </div>
        </div>
        <MatchCard
          entrant={rightEntrant}
          side="right"
          state={rightState}
          showSideTag={showSideTag}
          isUpsetWin={showUpsetBanner && upsetInfo?.side === 1}
          onPick={onPickRight}
          onPreview={onPreviewRight}
        />
      </div>
      {children}
    </>
  );
}
