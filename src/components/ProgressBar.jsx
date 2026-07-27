import React from 'react';

/**
 * Progress bar component.
 * @param {string} roundName - current round name
 * @param {number} matchIdx - current match index (1-based)
 * @param {number} matchTotal - total matches in the round
 * @param {number} doneCnt - number of matches decided overall
 * @param {number} progTotal - total matches in the whole tournament
 */
export default function ProgressBar({ roundName, matchIdx, matchTotal, doneCnt, progTotal }) {
  const pct = Math.min(100, progTotal > 0 ? (doneCnt / progTotal) * 100 : 0);

  return (
    <div className="progress-row">
      <span className="round-badge">{roundName}</span>
      <div className="progress">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-meta">
        第 <b>{matchIdx}</b>/<b>{matchTotal}</b> 场 · 已决出 <b>{doneCnt}</b>/<b>{progTotal}</b>
      </span>
    </div>
  );
}
