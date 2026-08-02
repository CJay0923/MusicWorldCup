import React from 'react';

/**
 * Progress bar component.
 * @param {string} roundName - current round name
 * @param {number} matchIdx - current match index (1-based)
 * @param {number} matchTotal - total matches in the round
 * @param {number} doneCnt - number of matches decided overall
 * @param {number} progTotal - total matches in the whole tournament
 */
export default function ProgressBar({
  roundName,
  matchIdx,
  matchTotal,
  doneCnt,
  progTotal,
}) {
  const pct = Math.min(100, progTotal > 0 ? (doneCnt / progTotal) * 100 : 0);

  return (
    <div className="mb-[22px] mt-1.5 flex flex-wrap items-center gap-3.5">
      <span className="whitespace-nowrap rounded-full border border-accent/35 bg-accent/[0.12] px-3.5 py-[7px] font-display text-[13px] font-extrabold tracking-wider text-accent shadow-[0_0_12px_rgba(230,57,70,0.1)]">
        {roundName}
      </span>
      <div className="relative h-2.5 min-w-[160px] flex-1 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
        <i
          className="block h-full rounded-full bg-gradient-to-r from-accent2 to-accent shadow-[0_0_10px_rgba(255,210,74,0.4)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap font-display text-xs tabular-nums text-muted">
        第 <b className="text-white">{matchIdx}</b>/<b className="text-white">{matchTotal}</b>{' '}
        场 · 已决出 <b className="text-white">{doneCnt}</b>/
        <b className="text-white">{progTotal}</b>
      </span>
    </div>
  );
}
