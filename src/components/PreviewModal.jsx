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
      className="fixed inset-0 z-[--z-preview] flex items-center justify-center bg-[rgba(244,237,224,0.92)] p-6 backdrop-blur-[12px] animate-[fade_0.25s_ease]"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-[380px] flex-col items-center gap-4 rounded-2xl border-[3px] border-ink bg-bg2 px-7 pb-7 pt-8 shadow-[3px_3px_0_#1a1a1a] animate-[pop_0.3s_cubic-bezier(0.22,1.3,0.36,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-bg3 text-base text-muted transition-all duration-200 hover:bg-ink/8 hover:text-ink"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>

        {/* 封面 */}
        <div
          className={clsx(
            'h-[140px] w-[140px] overflow-hidden rounded-md border-2 border-ink/20 shadow-[3px_3px_0_#1a1a1a]',
            !song.pic &&
              'flex items-center justify-center bg-bg3',
          )}
        >
          {song.pic ? (
            <img className="h-full w-full object-cover" src={song.pic} alt="专辑封面" />
          ) : (
            <span className="text-5xl text-accent/40">♪</span>
          )}
        </div>

        {/* 歌曲信息 */}
        <div className="text-center">
          <div className="text-lg font-extrabold text-ink">{song.name}</div>
          <div className="text-[13px] text-muted">{artist}</div>
          {song.albumName && (
            <div className="mt-0.5 text-[11px] text-muted/70">{song.albumName}</div>
          )}
        </div>

        {/* 播放控制 */}
        <div className="flex w-full items-center gap-3.5">
          <button
            className={clsx(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-none text-xl transition-all duration-200',
              isLoading
                ? 'cursor-default bg-accent/30'
                : 'cursor-pointer bg-accent text-[#0b0b13] shadow-[0_4px_14px_rgba(255,210,74,0.3)] hover:scale-[1.08]',
            )}
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isLoading ? (
              <span className="block h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#0b0b13]/30 border-t-[#0b0b13]" />
            ) : isPlaying ? (
              '⏸'
            ) : (
              '▶'
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div
              className="relative h-1.5 cursor-pointer rounded-[3px] bg-white/10"
              onClick={onSeek}
              onTouchMove={onSeek}
            >
              <div
                className="h-full rounded-[3px] bg-gradient-to-r from-accent2 to-accent"
                style={{ width: `${progress}%` }}
              />
              {chorusTime != null && chorusPct > 0 && (
                <div
                  className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-accent2 shadow-[0_0_4px_rgba(255,92,138,0.7)]"
                  style={{ left: `${chorusPct}%` }}
                  title="高潮片段"
                />
              )}
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
                style={{ left: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink/50">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
