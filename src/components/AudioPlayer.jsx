import React from 'react';
import { fmtTime } from '../utils/format.js';

/**
 * Music player overlay.
 * All state and methods are passed in from the useAudioPlayer hook.
 * @param {boolean} visible - whether the player overlay is shown
 * @param {() => void} closePlayer - close the player
 * @param {string} cover - cover image src
 * @param {string} title - song title
 * @param {string} artist - artist name
 * @param {boolean} isLoading - whether audio is loading
 * @param {boolean} isPlaying - whether audio is currently playing
 * @param {() => void} togglePlay - toggle play / pause
 * @param {number} progress - progress bar fill percentage (0-100)
 * @param {number} currentTime - current playback time in seconds
 * @param {number} duration - total duration in seconds
 * @param {number|null} chorusTime - chorus start time in seconds (null if none)
 * @param {number} chorusPct - chorus mark left position percentage
 * @param {(e: React.MouseEvent) => void} seekHandler - seek when clicking the progress bar
 * @param {() => void} restart - restart playback from the beginning
 * @param {string} fallbackNE - netease music fallback URL
 * @param {string} fallbackQQ - QQ music fallback URL
 * @param {React.RefObject<HTMLAudioElement>} audioRef - ref for the audio element
 */
export default function AudioPlayer({
  visible,
  closePlayer,
  cover,
  title,
  artist,
  isLoading,
  isPlaying,
  togglePlay,
  progress,
  currentTime,
  duration,
  chorusTime,
  chorusPct,
  seekHandler,
  restart,
  fallbackNE,
  fallbackQQ,
  audioRef,
}) {
  // Close when clicking the backdrop (not the panel itself)
  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      closePlayer?.();
    }
  };

  return (
    <div
      className={`player-overlay${visible ? ' show' : ''}`}
      onClick={closeOnBackdrop}
    >
      <div className="player-panel">
        <button
          className="player-close"
          onClick={closePlayer}
          type="button"
          aria-label="关闭试听"
        >
          ✕
        </button>

        <div className="pp-head">
          <img
            className="pp-cover"
            src={cover || ''}
            alt=""
            style={{ visibility: cover ? 'visible' : 'hidden' }}
          />
          <div className="pp-info">
            <div className="pp-title">{title || '试听'}</div>
            <div className="pp-sub">{artist}</div>
          </div>
        </div>

        <div className="audio-player">
          <div className="ap-main">
            <button
              className={`ap-play-btn${isLoading ? ' loading' : ''}`}
              onClick={togglePlay}
              type="button"
              aria-label="播放/暂停"
            >
              {isLoading ? (
                <span className="spin" />
              ) : isPlaying ? (
                '⏸'
              ) : (
                '▶'
              )}
            </button>
            <div className="ap-progress-wrap">
              <div className="ap-bar" onClick={seekHandler}>
                <div className="fill" style={{ width: `${progress}%` }} />
                {chorusTime != null && (
                  <div
                    className="chorus-mark show"
                    style={{ left: `${chorusPct}%` }}
                  />
                )}
              </div>
              <div className="ap-time">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>
          </div>

          {chorusTime != null && (
            <div className="ap-chorus-row">
              <span className="chorus-badge">
                ♪ 高潮片段 {fmtTime(chorusTime)}
              </span>
              <button className="ap-restart" onClick={restart} type="button">
                从头播放
              </button>
            </div>
          )}

          <audio
            ref={audioRef}
            preload="metadata"
            crossOrigin="anonymous"
          />
        </div>

        <div className="player-fallback">
          <a href={fallbackNE} target="_blank" rel="noopener noreferrer">
            网易云音乐 ↗
          </a>
          <a href={fallbackQQ} target="_blank" rel="noopener noreferrer">
            QQ音乐 ↗
          </a>
        </div>

        <div className="player-hint">
          完整播放 · 自动跳转高潮片段 · 可边听边选
        </div>
      </div>
    </div>
  );
}
