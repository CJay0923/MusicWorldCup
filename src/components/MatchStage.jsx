import React from 'react';
import MatchCard from './MatchCard.jsx';

/**
 * Battle stage: two cards + VS marker.
 * @param {object|null} leftEntrant - left song object
 * @param {object|null} rightEntrant - right song object
 * @param {'default'|'win'|'lose'|'locked'} leftState - left card state
 * @param {'default'|'win'|'lose'|'locked'} rightState - right card state
 * @param {boolean} showSideTag - whether to show half tags on the cards
 * @param {(slot: 0|1) => void} onPick - called with 0 (left) or 1 (right) when a card is picked
 * @param {(slot: 0|1) => void} onPreview - called with 0 (left) or 1 (right) for preview
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
  children,
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-[18px] max-md:grid-cols-1 max-md:gap-3">
        <MatchCard
          entrant={leftEntrant}
          side="left"
          state={leftState}
          showSideTag={showSideTag}
          onPick={() => onPick?.(0)}
          onPreview={() => onPreview?.(0)}
        />
        {/* VS 徽章 */}
        <div className="flex min-w-[64px] flex-col items-center justify-center gap-2 max-md:flex-row max-md:min-w-0">
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] border-ink bg-accent font-display text-xl font-black tracking-wider text-paper shadow-[3px_3px_0_#1a1a1a] animate-[pulse_2.4s_ease-in-out_infinite]">
            VS
          </div>
          <div className="font-display text-[11px] uppercase tracking-[2px] text-muted max-md:hidden">
            ROUND
          </div>
        </div>
        <MatchCard
          entrant={rightEntrant}
          side="right"
          state={rightState}
          showSideTag={showSideTag}
          onPick={() => onPick?.(1)}
          onPreview={() => onPreview?.(1)}
        />
      </div>
      {children}
    </>
  );
}
