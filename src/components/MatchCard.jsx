import React from 'react';
import { clsx } from 'clsx';

/**
 * A single battle card (supports songs, albums, and singers).
 * @param {object|null} entrant - entrant object with optional `type` field ('album' | 'singer' | undefined=song)
 * @param {'left'|'right'} side - which side the card is on
 * @param {'default'|'win'|'lose'|'locked'} state - card visual state
 * @param {boolean} showSideTag - whether to show the left/right half tag
 * @param {() => void} onPick - called when the card is clicked to pick a winner
 * @param {() => void} onPreview - called when the preview button is clicked (songs only)
 */
export default function MatchCard({
  entrant,
  side,
  state,
  showSideTag,
  onPick,
  onPreview,
}) {
  const entrantType = entrant?.type || 'song';
  const isAlbum = entrantType === 'album';
  const isSinger = entrantType === 'singer';
  const isSong = !isAlbum && !isSinger;

  // 图片 onError fallback
  const t062Url = entrant?.songmid
    ? `https://y.gtimg.cn/music/photo_new/T062R150x150M000${entrant.songmid}.jpg`
    : '';
  const t002Url = entrant?.albumMid
    ? `https://y.gtimg.cn/music/photo_new/T002R150x150M000${entrant.albumMid}.jpg`
    : '';
  const coverSrc =
    entrant?.picLocal || entrant?.pic || entrant?.songPic || t062Url || t002Url || '';

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

  const albumLinkUrl =
    isAlbum && entrant?.albumMid
      ? `https://y.qq.com/n/ryqq/albumDetail/${entrant.albumMid}`
      : '';

  const cardCls = clsx(
    // 基础布局
    'group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center',
    'overflow-hidden rounded-lg px-[22px] py-[30px] text-center',
    'border backdrop-blur-[12px]',
    'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    // 玻璃拟态背景
    'border-white/12 bg-gradient-to-br from-white/6 to-bg2/80',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.3)]',
    // 悬浮效果
    'hover:-translate-y-1.5',
    side === 'left' &&
      'hover:border-accent/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_22px_50px_rgba(255,210,74,0.25),0_0_0_1px_rgba(255,210,74,0.15)]',
    side === 'right' &&
      'hover:border-right/55 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_22px_50px_rgba(255,138,61,0.25),0_0_0_1px_rgba(255,138,61,0.15)]',
    // 状态
    state === 'win' &&
      side === 'left' &&
      'border-accent shadow-[0_0_0_2px_var(--left),0_22px_60px_rgba(255,210,74,0.35)]',
    state === 'win' &&
      side === 'right' &&
      'border-right shadow-[0_0_0_2px_var(--right),0_22px_60px_rgba(255,138,61,0.35)]',
    state === 'lose' && 'scale-[0.97] opacity-30 saturate-[0.4]',
    state === 'locked' && 'pointer-events-none',
    // 种子卡片
    entrant?.isSeed && 'border-accent/45 bg-gradient-to-br from-bg2 to-accent/6',
  );

  return (
    <div className={cardCls} onClick={onPick}>
      {/* 半区标签 */}
      {showSideTag && (
        <span
          className={clsx(
            'absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wider',
            side === 'left'
              ? 'border border-accent/35 bg-accent/16 text-accent'
              : 'border border-right/40 bg-right/16 text-right',
          )}
        >
          {side === 'left' ? '左半区' : '右半区'}
        </span>
      )}
      {/* 种子排名 */}
      <span
        className={clsx(
          'absolute right-4 top-3.5 font-display text-[11px] font-bold tabular-nums',
          entrant?.isSeed
            ? 'rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-accent'
            : 'text-muted',
        )}
      >
        {entrant?.isSeed ? `种子#${entrant.seedRank}` : `#${entrant?.seed}`}
      </span>
      {/* 跨歌手模式：歌手头像+名称 */}
      {entrant?.singerName && !isSinger && (
        <div className="mb-1 flex items-center gap-1.5">
          {entrant.singerPhoto && (
            <img
              className="h-5 w-5 rounded-full object-cover"
              src={entrant.singerPhoto}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span className="text-xs text-muted">{entrant.singerName}</span>
        </div>
      )}
      {/* 封面 */}
      {coverSrc && (
        <div className="relative mb-2.5 h-[118px] w-[118px] shrink-0">
          <img
            className={clsx(
              'h-full w-full rounded-sm border-2 border-white/16 object-cover',
              'bg-bg3 shadow-[0_10px_28px_rgba(0,0,0,0.45)]',
              'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              'group-hover:scale-[1.06] group-hover:-rotate-1',
              state === 'win' && 'scale-110',
              state === 'lose' && 'brightness-[0.6] saturate-[0.3]',
            )}
            src={coverSrc}
            alt={isAlbum ? '专辑封面' : isSinger ? '歌手头像' : '专辑封面'}
            loading="lazy"
            onError={handleImgError}
          />
          {/* 种子徽章 */}
          {entrant?.isSeed && (
            <span className="absolute -right-2 -top-2 z-[2] rounded-full bg-gradient-to-br from-accent to-[#ffb13d] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-[#2a1d00] shadow-[0_4px_12px_rgba(255,177,61,0.4)]">
              种子
            </span>
          )}
        </div>
      )}
      {/* 歌曲名 */}
      <div
        className={clsx(
          'mx-0 my-2 font-display font-black leading-tight tracking-tight break-words text-balance',
          isAlbum || isSinger ? 'text-[15px]' : 'text-[clamp(26px,5vw,40px)]',
        )}
      >
        {entrant?.name || '—'}
      </div>
      {/* 专辑/歌手元信息 */}
      {isAlbum && entrant?.songCount && (
        <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
          {entrant.songCount} 首歌
        </span>
      )}
      {isSinger && (
        <>
          {entrant?.topSong && (
            <div className="mt-0.5 text-xs text-white/45">代表作：{entrant.topSong}</div>
          )}
          <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
            {entrant.songCount || 0} 首 · {entrant.albumCount || 0} 张专辑
          </span>
        </>
      )}
      {/* 提示文字 */}
      <div className="text-[12.5px] font-semibold tracking-wide text-muted">
        点击选择晋级
      </div>
      <div
        className={clsx(
          'mt-4 text-xs text-muted opacity-0 translate-y-1.5 transition-all duration-250',
          'group-hover:opacity-100 group-hover:translate-y-0',
        )}
      >
        {side === 'left' ? '← 我选这个' : '我选这个 →'}
      </div>
      {/* 试听按钮 */}
      {isSong && entrant && onPreview && (
        <button
          className="mt-1 inline-flex items-center gap-1 rounded-[20px] border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition-all duration-200 hover:border-accent/50 hover:bg-accent/20"
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
      {/* 听原曲 */}
      {isSong && (entrant?.itunesTrackUrl || entrant?.songmid) && (
        <a
          className="mt-1 inline-flex items-center gap-1 rounded-[20px] border border-[#5fd4a8]/25 bg-[#5fd4a8]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5fd4a8] no-underline transition-all duration-200 hover:border-[#5fd4a8]/50 hover:bg-[#5fd4a8]/20"
          href={
            entrant?.itunesTrackUrl ||
            `https://y.qq.com/n/ryqq/songDetail/${entrant.songmid}`
          }
          target="_blank"
          rel="noopener noreferrer"
          aria-label="听原曲"
          onClick={(e) => e.stopPropagation()}
        >
          ♪ 听原曲
        </a>
      )}
      {isAlbum && albumLinkUrl && (
        <a
          className="mt-1 inline-flex items-center gap-1 rounded-[20px] border border-[#5fd4a8]/25 bg-[#5fd4a8]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5fd4a8] no-underline transition-all duration-200 hover:border-[#5fd4a8]/50 hover:bg-[#5fd4a8]/20"
          href={albumLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="查看专辑"
          onClick={(e) => e.stopPropagation()}
        >
          ♪ 查看专辑
        </a>
      )}
      {/* 胜出勾选 */}
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 flex items-center justify-center text-[64px]',
          'transition-all duration-350 ease-[cubic-bezier(0.22,1.4,0.36,1)]',
          state === 'win' ? 'scale-100 opacity-100' : 'scale-[0.4] opacity-0',
        )}
      >
        ✓
      </div>
    </div>
  );
}
