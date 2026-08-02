import React from 'react';
import { clsx } from 'clsx';

/**
 * A single battle card (supports songs, albums, and singers).
 * GOAT-style: full-bleed cover image as background, name overlaid at bottom.
 *
 * @param {object|null} entrant - entrant object with optional `type` field ('album' | 'singer' | undefined=song)
 * @param {'left'|'right'} side - which side the card is on
 * @param {'default'|'win'|'lose'|'locked'} state - card visual state
 * @param {boolean} showSideTag - whether to show the left/right half tag
 * @param {() => void} onPick - called when the card is clicked to pick a winner
 * @param {() => void} onPreview - called when the preview button is clicked (songs only)
 */
const MatchCard = React.memo(function MatchCard({
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

// 图片加载优化：优先使用最可靠的来源，避免闪烁
const t062Url = entrant?.songmid
  ? `https://y.gtimg.cn/music/photo_new/T062R400x400M000${entrant.songmid}.jpg`
  : '';
const t002Url = entrant?.albumMid
  ? `https://y.gtimg.cn/music/photo_new/T002R400x400M000${entrant.albumMid}.jpg`
  : '';

// 确定最佳图片源（优先级：本地 > CDN专辑 > CDN歌曲 > pic字段）
const getBestCoverSrc = () => {
  // 有本地封面优先
  if (entrant?.picLocal) return entrant.picLocal;
  // 有专辑CDN优先
  if (t002Url) return t002Url;
  // 其次歌曲CDN
  if (t062Url) return t062Url;
  // 最后使用pic字段
  if (entrant?.pic) return entrant.pic;
  // songPic作为最后备选
  if (entrant?.songPic) return entrant.songPic;
  return '';
};

const coverSrc = getBestCoverSrc();

// 简化的错误处理：只尝试一次fallback
const handleImgError = (e) => {
  const img = e.currentTarget;
  const tried = img.dataset.tried;
  
  // 如果已经尝试过，直接隐藏
  if (tried) {
    img.style.display = 'none';
    return;
  }
  
  // 标记已尝试
  img.dataset.tried = '1';
  
  // 尝试唯一的备选方案
  if (coverSrc !== t062Url && t062Url) {
    img.src = t062Url;
  } else if (coverSrc !== t002Url && t002Url) {
    img.src = t002Url;
  } else if (entrant?.pic && coverSrc !== entrant.pic) {
    img.src = entrant.pic;
  } else {
    img.style.display = 'none';
  }
};

  const albumLinkUrl =
    isAlbum && entrant?.albumMid
      ? `https://y.qq.com/n/ryqq/albumDetail/${entrant.albumMid}`
      : '';

  // GOAT-style: border glow based on side and state
  const cardCls = clsx(
    // 基础：全高卡片，封面铺满
    'group relative flex min-h-[380px] cursor-pointer flex-col items-end justify-end overflow-hidden',
    'rounded-2xl text-left',
    'border-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    // 默认状态：暗色边框 + 微光
    'border-white/10 bg-bg3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
    // 悬浮效果
    'hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]',
    side === 'left' &&
      'hover:border-accent/50 hover:shadow-[0_16px_48px_rgba(230,57,70,0.15)]',
    side === 'right' &&
      'hover:border-side-right/55 hover:shadow-[0_16px_48px_rgba(255,182,39,0.15)]',
    // 胜出状态：发光边框
    state === 'win' &&
      side === 'left' &&
      'border-accent shadow-[0_0_30px_rgba(230,57,70,0.35),0_0_60px_rgba(230,57,70,0.12)]',
    state === 'win' &&
      side === 'right' &&
      'border-side-right shadow-[0_0_30px_rgba(255,182,39,0.35),0_0_60px_rgba(255,182,39,0.12)]',
    // 失败状态：灰暗 + 缩小
    state === 'lose' && 'scale-[0.97] opacity-40 grayscale',
    state === 'locked' && 'pointer-events-none',
    // 种子卡片
    entrant?.isSeed && 'border-accent/40 bg-bg2',
  );

  // 底部渐变遮罩（让文字在封面上清晰可读）
  const overlayGradient =
    'linear-gradient(to top, rgba(10,11,16,0.95) 0%, rgba(10,11,16,0.7) 35%, rgba(10,11,16,0.2) 65%, transparent 100%)';

  return (
    <div
      className={cardCls}
      role="button"
      tabIndex={0}
      aria-label={`选择「${entrant?.name || '—'}」晋级`}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick?.();
        }
      }}
    >
      {/* ===== 全屏封面背景 ===== */}
      <div className="absolute inset-0 bg-bg3">
        {coverSrc ? (
          <img
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            src={coverSrc}
            alt={isAlbum ? '专辑封面' : isSinger ? '歌手头像' : '歌曲封面'}
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            onError={handleImgError}
          />
        ) : (
          /* 无封面时的占位图案 */
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg2 to-bg3">
            <span className="text-6xl text-white/5">♪</span>
          </div>
        )}
      </div>

      {/* 底部渐变遮罩 */}
      <div className="absolute inset-0" style={{ background: overlayGradient }} />

      {/* 半区标签 */}
      {showSideTag && (
        <span
          className={clsx(
            'absolute left-3.5 top-3.5 z-10 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wider backdrop-blur-md',
            side === 'left'
              ? 'border border-accent/40 bg-accent/20 text-accent'
              : 'border border-side-right/40 bg-side-right/20 text-side-right',
          )}
        >
          {side === 'left' ? '左半区' : '右半区'}
        </span>
      )}

      {/* 种子排名 */}
      <span
        className={clsx(
          'absolute right-4 top-3.5 z-10 font-display text-[11px] font-bold tabular-nums backdrop-blur-sm',
          entrant?.isSeed
            ? 'rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-accent'
            : 'rounded-full bg-black/40 px-2 py-0.5 text-white/60',
        )}
      >
        {entrant?.isSeed ? `种子#${entrant.seedRank}` : `#${entrant?.seed}`}
      </span>

      {/* 跨歌手模式：歌手头像+名称 */}
      {entrant?.singerName && !isSinger && (
        <div className="absolute left-3.5 top-12 z-10 flex items-center gap-1.5 backdrop-blur-sm">
          {entrant.singerPhoto && (
            <img
              className="h-5 w-5 rounded-full border border-white/20 object-cover"
              src={entrant.singerPhoto}
              alt=""
              loading="lazy"
              decoding="async"
              width={20}
              height={20}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span className="text-xs font-medium text-white/70">{entrant.singerName}</span>
        </div>
      )}

      {/* ===== 底部内容区 ===== */}
      <div className="relative z-10 w-full p-5 pb-5">
        {/* 歌曲名 — 大字突出 */}
        <div
          className={clsx(
            'mb-1 font-display font-black leading-tight tracking-tight break-words text-balance',
            isAlbum || isSinger ? 'text-[17px]' : 'text-[clamp(28px,5.5vw,44px)]',
          )}
        >
          {entrant?.name || '—'}
        </div>

        {/* 专辑/歌手元信息 */}
        {isAlbum && entrant?.songCount && (
          <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
            {entrant.songCount} 首歌
          </span>
        )}
        {isSinger && (
          <>
            {entrant?.topSong && (
              <div className="text-xs text-muted">代表作：{entrant.topSong}</div>
            )}
            <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
              {entrant.songCount || 0} 首 · {entrant.albumCount || 0} 张专辑
            </span>
          </>
        )}

        {/* 提示文字 & 操作按钮行 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[12.5px] font-semibold tracking-wide text-muted">
            点击选择晋级
          </div>
          <div className="flex items-center gap-2">
            {/* 试听按钮 */}
            {isSong && entrant && onPreview && (
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/20 hover:text-white"
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
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-good/25 bg-good/10 px-2.5 py-1 text-[11px] font-semibold text-good no-underline backdrop-blur-sm transition-all duration-200 hover:border-good/45 hover:bg-good/20"
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
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-good/25 bg-good/10 px-2.5 py-1 text-[11px] font-semibold text-good no-underline backdrop-blur-sm transition-all duration-200 hover:border-good/45 hover:bg-good/20"
                href={albumLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="查看专辑"
                onClick={(e) => e.stopPropagation()}
              >
                ♪ 查看专辑
              </a>
            )}
          </div>
        </div>

        {/* 悬浮提示箭头 */}
        <div
          className={clsx(
            'mt-2 text-xs font-bold text-white/0 transition-all duration-300',
            'group-hover:text-white/50 group-hover:translate-x-1',
            side === 'right' && 'group-hover:-translate-x-1 group-hover:text-side-right',
          )}
        >
          {side === 'left' ? '← 我选这个' : '我选这个 →'}
        </div>
      </div>

      {/* 胜出勾选 — 大号覆盖层 */}
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 z-20 flex items-center justify-center',
          'bg-accent/20 backdrop-blur-[2px]',
          'transition-all duration-400 ease-[cubic-bezier(0.22,1.4,0.36,1)]',
          state === 'win' ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-accent bg-accent/90 text-4xl font-black text-ink shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          ✓
        </div>
      </div>
    </div>
  );
});

export default MatchCard;
