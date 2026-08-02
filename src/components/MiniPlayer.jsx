// MiniPlayer.jsx
// 卡片内嵌的迷你播放条：▶/⏸ + 进度条(含高潮标记+拖拽手柄) + 时间
import { clsx } from 'clsx';
import { fmtTime } from '../utils/format.js';

/**
 * @param {boolean} isLoading
 * @param {boolean} isPlaying
 * @param {() => void} onTogglePlay
 * @param {number} progress 0-100
 * @param {number} currentTime 秒
 * @param {number} duration 秒
 * @param {number|null} chorusTime 秒
 * @param {number} chorusPct 0-100
 * @param {(e) => void} onSeek
 * @param {string} variant 'card' | 'gp' 用于适配不同卡片容器
 */
export default function MiniPlayer({
  isLoading,
  isPlaying,
  isActive,
  onTogglePlay,
  progress,
  currentTime,
  duration,
  chorusTime,
  chorusPct,
  onSeek,
  variant = 'card',
}) {
  const active = isActive ?? (isPlaying || isLoading);
  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 right-0 z-[2] flex items-center gap-1.5 rounded-b-lg-[--radius] px-2.5 pb-[5px] pt-1',
        variant === 'gp' && 'gap-1 px-2 pb-1 pt-[3px]',
        active
          ? 'bg-black/30'
          : 'justify-center bg-transparent p-1',
      )}
    >
      <button
        className={clsx(
          'flex shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-[11px]',
          variant === 'gp' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6',
          isLoading
            ? 'cursor-default bg-bg3 text-muted shadow-none'
            : 'bg-accent text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:scale-[1.08] active:scale-[0.94]',
        )}
        type="button"
        aria-label={isPlaying ? '暂停' : '播放'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay?.();
        }}
      >
        {isLoading ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
        ) : isPlaying ? (
          '⏸'
        ) : (
          '▶'
        )}
      </button>
      {active && (
        <>
          <div className="min-w-0 flex-1">
            <div
              className="relative h-2 cursor-pointer rounded-full bg-white/15 transition-[height] duration-150 hover:h-2.5"
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
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-accent shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-transform duration-150 [.mp-bar:hover_&]:scale-100"
                style={{ left: `${progress}%` }}
              />
            </div>
            <div
              className={clsx(
                'mt-0.5 flex justify-between text-muted tabular-nums',
                variant === 'gp' ? 'text-[8px]' : 'text-[9px]',
              )}
            >
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
          <button
            className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[10px] text-muted transition-colors duration-200 hover:text-accent2"
            type="button"
            aria-label="停止试听"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay?.({ stop: true });
            }}
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
