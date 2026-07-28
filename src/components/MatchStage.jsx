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
      <div className="match">
        <MatchCard
          entrant={leftEntrant}
          side="left"
          state={leftState}
          showSideTag={showSideTag}
          onPick={() => onPick?.(0)}
          onPreview={() => onPreview?.(0)}
        />
        <div className="vs">
          <div className="vs-badge">VS</div>
          <div className="vs-line">ROUND</div>
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
