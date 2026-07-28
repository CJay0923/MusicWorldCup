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
    <div className={clsx('mini-player', variant, { active })}>
      <button
        className={clsx('mp-play', { loading: isLoading })}
        type="button"
        aria-label={isPlaying ? '暂停' : '播放'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay?.();
        }}
      >
        {isLoading ? <span className="spin" /> : isPlaying ? '⏸' : '▶'}
      </button>
      {active && (
        <>
          <div className="mp-body">
            <div className="mp-bar" onClick={onSeek} onTouchMove={onSeek}>
              <div className="mp-fill" style={{ width: `${progress}%` }} />
              {chorusTime != null && chorusPct > 0 && (
                <div className="mp-chorus" style={{ left: `${chorusPct}%` }} title="高潮片段" />
              )}
              <div className="mp-thumb" style={{ left: `${progress}%` }} />
            </div>
            <div className="mp-time">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
          <button
            className="mp-stop"
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
