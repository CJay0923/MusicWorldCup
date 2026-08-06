import React from 'react';
import { clsx } from 'clsx';
import { coverUrl, jsDelivrCoverUrl, qqCoverUrl } from '../lib/assets';

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
  isUpsetWin,
  onPick,
  onPreview,
}) {
  const entrantType = entrant?.type || 'song';
  const isAlbum = entrantType === 'album';
  const isSinger = entrantType === 'singer';
  const isSong = !isAlbum && !isSinger;

// 图片加载：唯一来源是 jsDelivr（coverUrl/picLocal），不再降级到外部音乐 API
const getBestCoverSrc = () => {
  // 优先使用 jsDelivr CDN 封面
  if (entrant?.picLocal) return entrant.picLocal;
  // 有 albumMid 则构建 jsDelivr URL
  if (entrant?.albumMid) return coverUrl(entrant.albumMid);
  // pic 字段（相对路径 /covers/xxx，作为最后兜底）
  if (entrant?.pic && entrant.pic.startsWith('/')) return entrant.pic;
  return '';
};

const coverSrc = getBestCoverSrc();

// 错误处理：同源 → jsDelivr → QQ CDN（动态歌手兜底）→ 隐藏图片
const handleImgError = (e) => {
  const img = e.currentTarget;
  const tried = img.dataset.tried || '';

  // 已经尝试过 QQ CDN，直接隐藏
  if (tried.includes('qq')) {
    img.style.display = 'none';
    return;
  }

  // 第三级：jsDelivr 失败 → QQ CDN
  if (tried === 'jsdelivr') {
    img.dataset.tried = 'jsdelivr,qq';
    if (entrant?.albumMid) img.src = qqCoverUrl(entrant.albumMid);
    else img.style.display = 'none';
    return;
  }

  // 第二级：同源失败 → jsDelivr
  img.dataset.tried = 'jsdelivr';
  if (entrant?.albumMid) {
    img.src = jsDelivrCoverUrl(entrant.albumMid);
  } else {
    img.style.display = 'none';
  }
};

  const albumLinkUrl =
    isAlbum && entrant?.albumMid
      ? `https://y.qq.com/n/ryqq/albumDetail/${entrant.albumMid}`
      : '';

  // GOAT-style: 高对比实色边框 + 竞技级状态反馈
  const cardCls = clsx(
    // 基础：全高卡片，封面铺满，更锐利圆角
    'group relative flex min-h-[300px] cursor-pointer flex-col items-end justify-end overflow-hidden sm:min-h-[380px]',
    'rounded-xl text-left',
    'border-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    // 默认状态：可见边框 + 深沉阴影
    'border-white/[0.14] bg-bg3 shadow-[0_6px_20px_rgba(0,0,0,0.35)]',
    // 悬浮：上浮 + 边框亮起
    'hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]',
    side === 'left' && 'hover:border-accent/60 hover:shadow-[0_12px_30px_rgba(124,58,237,0.15)]',
    side === 'right' && 'hover:border-side-right/60 hover:shadow-[0_12px_30px_rgba(74,222,128,0.12)]',
    // 胜出状态：强发光边框 + 底色 + 外发光（聚光灯打在赢家身上）
    state === 'win' &&
      side === 'left' &&
      'border-accent bg-accent/[0.08] shadow-[0_0_24px_rgba(124,58,237,0.25),0_6px_20px_rgba(0,0,0,0.3)] scale-[1.01]',
    state === 'win' &&
      side === 'right' &&
      'border-side-right bg-side-right/[0.08] shadow-[0_0_24px_rgba(74,222,128,0.2),0_6px_20px_rgba(0,0,0,0.3)] scale-[1.01]',
    // 失败状态：重度灰暗（GOAT 风格——败方明显"熄灭"）
    state === 'lose' && 'scale-[0.96] opacity-50 grayscale-[0.80] border-white/[0.06] shadow-none',
    state === 'locked' && 'pointer-events-none opacity-70',
    // 种子卡片
    entrant?.isSeed && 'border-accent/30 bg-bg2',
    // 爆冷获胜抖动
    isUpsetWin && state === 'win' && 'animate-[upsetShake_0.5s_ease-in-out]',
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
          <div className="flex h-full w-full items-center justify-center bg-bg3">
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
          <span className="text-xs font-medium text-muted">{entrant.singerName}</span>
        </div>
      )}

      {/* ===== 底部内容区 ===== */}
      <div className="relative z-10 w-full p-5 pb-5">
        {/* 歌曲名 — 大字突出 */}
        <div
          className={clsx(
            'mb-1 font-black leading-tight tracking-normal break-words text-balance',
            isAlbum || isSinger ? 'text-[17px]' : 'text-[clamp(22px,7vw,44px)]',
          )}
        >
          {entrant?.name || '—'}
        </div>

        {/* 专辑/歌手元信息 */}
        {isAlbum && entrant?.songCount && (
          <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
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
          <div className="text-[13px] font-bold tracking-wide text-muted">
            点击选择晋级
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 试听按钮 */}
            {isSong && entrant && onPreview && (
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/20"
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
            'group-hover:text-muted group-hover:translate-x-1',
            side === 'right' && 'group-hover:-translate-x-1 group-hover:text-side-right',
          )}
        >
          {side === 'left' ? '← 我选这个' : '我选这个 →'}
        </div>
      </div>

      {/* 胜出勾选 — 缩小圆章，移至右上角，不遮挡封面 */}
      <div
        className={clsx(
          'pointer-events-none absolute right-4 top-16 z-20 flex h-12 w-12 items-center justify-center',
          'rounded-full border-2 border-accent bg-accent/90 text-xl font-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
          'transition-all duration-400 ease-[cubic-bezier(0.22,1.4,0.36,1)]',
          state === 'win' ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
        )}
      >
        ✓
      </div>
    </div>
  );
});

export default MatchCard;
