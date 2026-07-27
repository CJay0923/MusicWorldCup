import React from 'react';
import { clsx } from 'clsx';

/**
 * A single song battle card.
 * @param {object|null} entrant - song object {name, side, seed, nid, pic, chorus, seedRank, isSeed} or null
 * @param {'left'|'right'} side - which side the card is on
 * @param {'default'|'win'|'lose'|'locked'} state - card visual state
 * @param {boolean} showSideTag - whether to show the left/right half tag (hidden in WC mode)
 * @param {() => void} onPick - called when the card is clicked to pick a winner
 * @param {() => void} onPreview - called when the preview button is clicked
 */
export default function MatchCard({
  entrant,
  side,
  state,
  showSideTag,
  onPick,
  onPreview,
  showPreview = true,
}) {
  const classes = clsx('card', side, state, { 'seed-card': entrant?.isSeed });

  return (
    <div className={classes} onClick={onPick}>
      {showSideTag && (
        <span className="side-tag">{side === 'left' ? '左半区' : '右半区'}</span>
      )}
      <span className="seed">
        {entrant?.isSeed ? `种子#${entrant.seedRank}` : `#${entrant?.seed}`}
      </span>
      <div className={clsx('album-wrap', { empty: !entrant?.pic })}>
        {entrant?.pic && (
          <img className="album-cover" src={entrant.pic} alt="专辑封面" loading="lazy" />
        )}
      </div>
      <div className="song">{entrant?.name || '—'}</div>
      <div className="ko">点击选择晋级</div>
      <div className="pick-hint">{side === 'left' ? '← 我选这首' : '我选这首 →'}</div>
      {showPreview && (
        <button
          className="preview-btn"
          type="button"
          aria-label="试听"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.();
          }}
        >
          <span className="ico">♪</span>
          <span className="txt">试听</span>
        </button>
      )}
      <div className="check" style={{ opacity: state === 'win' ? 1 : 0 }}>
        ✓
      </div>
    </div>
  );
}
