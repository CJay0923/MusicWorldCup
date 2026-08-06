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
    <div className="mb-6 mt-2 flex flex-wrap items-center gap-4">
      <span className="whitespace-nowrap rounded-lg border-2 border-accent/40 bg-accent/[0.14] px-4 py-2 font-display text-[15px] font-black tracking-wider text-accent shadow-[0_0_12px_rgba(124,58,237,0.1)]">
        {roundName}
      </span>
      <div className="relative h-3 min-w-48 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <i
          className="block h-full rounded-full bg-gradient-to-r from-accent to-[#c084fc] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap font-display text-sm tabular-nums text-muted tracking-wide">
        第 <b className="text-ink text-base">{matchIdx}</b>/<b className="text-ink text-base">{matchTotal}</b>{' '}
        场 · 已决出 <b className="text-ink text-base">{doneCnt}</b>/
        <b className="text-ink text-base">{progTotal}</b>
      </span>
    </div>
  );
}
