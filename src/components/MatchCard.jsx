import React from 'react';
import { clsx } from 'clsx';

/**
 * A single song battle card.
 * @param {object|null} entrant - song object {name, side, seed, nid, pic, songPic, chorus, seedRank, isSeed, singerName, singerPhoto} or null
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

  // 图片 onError fallback：本地封面 → 歌曲封面 → T062 CDN → T002 CDN → 空
  const t062Url = entrant?.songmid
    ? `https://y.gtimg.cn/music/photo_new/T062R300x300M000${entrant.songmid}.jpg`
    : '';
  const t002Url = entrant?.albumMid
    ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${entrant.albumMid}.jpg`
    : '';
  // 优先使用本地预下载的封面（最可靠），其次 CDN URL
  const coverSrc = entrant?.picLocal || entrant?.pic || entrant?.songPic || t062Url || t002Url || '';

  const handleImgError = (e) => {
    const img = e.currentTarget;
    const tried = img.dataset.tried || '';
    if (tried !== 'picLocal' && entrant?.picLocal) {
      img.dataset.tried = 'picLocal';
      img.src = entrant.picLocal;
      return;
    }
    if (tried !== 'pic' && entrant?.pic) {
      img.dataset.tried = 'pic';
      img.src = entrant.pic;
      return;
    }
    if (tried !== 'songPic' && entrant?.songPic) {
      img.dataset.tried = 'songPic';
      img.src = entrant.songPic;
      return;
    }
    if (tried !== 't062' && t062Url) {
      img.dataset.tried = 't062';
      img.src = t062Url;
      return;
    }
    if (tried !== 't002' && t002Url) {
      img.dataset.tried = 't002';
      img.src = t002Url;
      return;
    }
    img.style.display = 'none';
  };

  return (
    <div className={classes} onClick={onPick}>
      {showSideTag && (
        <span className="side-tag">{side === 'left' ? '左半区' : '右半区'}</span>
      )}
      <span className="seed">
        {entrant?.isSeed ? `种子#${entrant.seedRank}` : `#${entrant?.seed}`}
      </span>
      {/* 跨歌手模式：歌手头像+名称 */}
      {entrant?.singerName && (
        <div className="card-singer-info">
          {entrant.singerPhoto && (
            <img
              className="card-singer-avatar"
              src={entrant.singerPhoto}
              alt=""
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span className="card-singer-name">{entrant.singerName}</span>
        </div>
      )}
      <div className={clsx('album-wrap', { empty: !coverSrc })}>
        {coverSrc && (
          <img
            className="album-cover"
            src={coverSrc}
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
