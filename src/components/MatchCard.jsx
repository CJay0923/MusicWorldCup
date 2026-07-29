import React from 'react';
import { clsx } from 'clsx';

/**
 * A single song battle card.
 * @param {object|null} entrant - song object {name, side, seed, nid, pic, songPic, chorus, seedRank, isSeed} or null
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
}) {
  const classes = clsx('card', side, state, {
    'seed-card': entrant?.isSeed,
  });

  // 图片 onError fallback：专辑封面 → 歌曲封面 → 空
  const handleImgError = (e) => {
    const img = e.currentTarget;
    if (entrant?.songPic && img.src !== entrant.songPic) {
      img.src = entrant.songPic;
    } else {
      img.style.display = 'none';
    }
  };

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
          <img
            className="album-cover"
            src={entrant.pic}
            alt="专辑封面"
            loading="lazy"
            onError={handleImgError}
          />
        )}
      </div>
      <div className="song">{entrant?.name || '—'}</div>
      <div className="ko">点击选择晋级</div>
      <div className="pick-hint">{side === 'left' ? '← 我选这首' : '我选这首 →'}</div>
      {entrant && onPreview && (
        <button
          className="card-preview-btn"
          type="button"
          aria-label="试听"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          ▶ 试听
        </button>
      )}
      {(entrant?.itunesTrackUrl || entrant?.songmid) && (
        <a
          className="card-original-btn"
          href={entrant?.itunesTrackUrl || `https://y.qq.com/n/ryqq/songDetail/${entrant.songmid}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="听原曲"
          onClick={(e) => e.stopPropagation()}
        >
          ♪ 听原曲
        </a>
      )}
      <div className="check" style={{ opacity: state === 'win' ? 1 : 0 }}>
        ✓
      </div>
    </div>
  );
}
