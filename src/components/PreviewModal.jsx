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
    <div className="preview-modal" onClick={onClose}>
      <div className="preview-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close" type="button" onClick={onClose} aria-label="关闭">
          ✕
        </button>
        
        <div className={clsx('preview-cover', { empty: !song.pic })}>
          {song.pic && <img src={song.pic} alt="专辑封面" />}
        </div>

        <div className="preview-info">
          <div className="preview-song-name">{song.name}</div>
          <div className="preview-artist">{artist}</div>
          {song.albumName && <div className="preview-album">{song.albumName}</div>}
        </div>

        <div className="preview-controls">
          <button
            className={clsx('preview-play-btn', { loading: isLoading })}
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isLoading ? <span className="spin" /> : isPlaying ? '⏸' : '▶'}
          </button>

          <div className="preview-progress">
            <div className="preview-bar" onClick={onSeek} onTouchMove={onSeek}>
              <div className="preview-fill" style={{ width: `${progress}%` }} />
              {chorusTime != null && chorusPct > 0 && (
                <div className="preview-chorus" style={{ left: `${chorusPct}%` }} title="高潮片段" />
              )}
              <div className="preview-thumb" style={{ left: `${progress}%` }} />
            </div>
            <div className="preview-time">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
