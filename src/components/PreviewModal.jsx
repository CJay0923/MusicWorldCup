import { clsx } from 'clsx';
import { fmtTime } from '../utils/format.js';

export default function PreviewModal({
  song,
  artist,
  isPlaying,
  isLoading,
  progress,
  currentTime,
  duration,
  chorusTime,
  chorusPct,
  onTogglePlay,
  onSeek,
  onClose,
}) {
  if (!song) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.96)] p-6 backdrop-blur-[6px] animate-[fade_0.25s_ease]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#1a1a2e] shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-[pop_0.3s_cubic-bezier(0.22,1.3,0.36,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-lg text-muted transition-all duration-200 hover:bg-white/[0.12] hover:text-ink"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>

        {/* 封面区域 — 全宽铺满 */}
        <div
          className={clsx(
            'relative h-[340px] w-full overflow-hidden',
            !song.pic && 'flex items-center justify-center bg-bg3',
          )}
        >
          {song.pic ? (
            <img
              className="h-full w-full object-cover"
              src={song.pic}
              alt="专辑封面"
            />
          ) : (
            <span className="text-5xl text-accent/40">♪</span>
          )}
          {/* 底部渐变遮罩 */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg2 to-transparent" />
        </div>

        {/* 歌曲信息 */}
        <div className="relative px-7 pb-6 pt-3">
          <div className="truncate text-2xl font-extrabold text-ink" title={song.name}>
            {song.name}
          </div>
          <div className="mt-1 truncate text-lg font-semibold text-accent">{artist}</div>
          {song.albumName && (
            <div className="mt-0.5 truncate text-sm text-muted/70">{song.albumName}</div>
          )}

          {/* 播放控制 */}
          <div className="mt-4 flex items-center gap-3">
            <button
              className={clsx(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-none text-2xl transition-all duration-200',
                isLoading
                  ? 'cursor-default bg-accent/25'
                  : 'cursor-pointer bg-accent text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:scale-[1.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)]',
              )}
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              {isLoading ? (
                <span className="block h-4 w-4 animate-spin rounded-full border-[2px] border-white/20 border-t-white" />
              ) : isPlaying ? (
                '⏸'
              ) : (
                '▶'
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div
                className="relative h-2 cursor-pointer rounded-full bg-white/[0.08]"
                onClick={onSeek}
                onTouchMove={onSeek}
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progress}%` }}
                />
                {chorusTime != null && chorusPct > 0 && (
                  <div
                    className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent2"
                    style={{ left: `${chorusPct}%` }}
                    title="高潮片段"
                  />
                )}
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
