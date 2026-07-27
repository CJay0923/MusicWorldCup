import React from 'react';
import { clsx } from 'clsx';
import MiniPlayer from './MiniPlayer.jsx';

/**
 * A single song battle card.
 * @param {object|null} entrant - song object {name, side, seed, nid, pic, chorus, seedRank, isSeed} or null
 * @param {'left'|'right'} side - which side the card is on
 * @param {'default'|'win'|'lose'|'locked'} state - card visual state
 * @param {boolean} showSideTag - whether to show the left/right half tag (hidden in WC mode)
 * @param {() => void} onPick - called when the card is clicked to pick a winner
 * @param {() => void} onPreview - called when the preview button is clicked
 * @param {boolean} isPlaying - this card's song is currently playing
 * @param {boolean} isLoading - this card's song is currently loading
 * @param {number} progress - playback progress 0-100
 * @param {number} currentTime - seconds
 * @param {number} duration - seconds
 * @param {number|null} chorusTime - seconds
 * @param {number} chorusPct - 0-100
 * @param {() => void} onTogglePlay - toggle play/pause
 * @param {(e) => void} onSeek - seek when clicking progress bar
 */
export default function MatchCard({
  entrant,
  side,
  state,
  showSideTag,
  onPick,
  onPreview,
  showPreview = true,
  isPlaying = false,
  isLoading = false,
  progress = 0,
  currentTime = 0,
  duration = 0,
  chorusTime = null,
  chorusPct = 0,
  onTogglePlay,
  onSeek,
}) {
  const isActive = isPlaying || isLoading;
  const classes = clsx('card', side, state, {
    'seed-card': entrant?.isSeed,
    playing: isActive,
  });

  const handleStop = (arg) => {
    if (arg && arg.stop) {
      onTogglePlay?.({ stop: true });
    } else {
      onTogglePlay?.();
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
          <img className="album-cover" src={entrant.pic} alt="专辑封面" loading="lazy" />
        )}
      </div>
      <div className="song">{entrant?.name || '—'}</div>
      <div className="ko">点击选择晋级</div>
      <div className="pick-hint">{side === 'left' ? '← 我选这首' : '我选这首 →'}</div>
      {showPreview && !isActive && (
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
      {showPreview && isActive && (
        <MiniPlayer
          isLoading={isLoading}
          isPlaying={isPlaying}
          onTogglePlay={handleStop}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          chorusTime={chorusTime}
          chorusPct={chorusPct}
          onSeek={onSeek}
          variant="card"
        />
      )}
      <div className="check" style={{ opacity: state === 'win' ? 1 : 0 }}>
        ✓
      </div>
    </div>
  );
}
