// MiniPlayer.jsx
// 卡片内嵌的迷你播放条：▶/⏸ + 进度条(含高潮标记) + 时间
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
  onTogglePlay,
  progress,
  currentTime,
  duration,
  chorusTime,
  chorusPct,
  onSeek,
  variant = 'card',
}) {
  return (
    <div className={clsx('mini-player', variant)}>
      <button
        className="mp-play"
        type="button"
        aria-label={isPlaying ? '暂停' : '播放'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay?.();
        }}
      >
        {isLoading ? <span className="spin" /> : isPlaying ? '⏸' : '▶'}
      </button>
      <div className="mp-body">
        <div className="mp-bar" onClick={onSeek}>
          <div className="mp-fill" style={{ width: `${progress}%` }} />
          {chorusTime != null && chorusPct > 0 && (
            <div className="mp-chorus" style={{ left: `${chorusPct}%` }} title="高潮片段" />
          )}
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
    </div>
  );
}
