import React from 'react';
import { clsx } from 'clsx';

/**
 * Round transition overlay.
 * @param {boolean} show - whether the overlay is visible
 * @param {string} icon - emoji icon shown large
 * @param {string} title - overlay heading
 * @param {string} sub - subtitle/description text
 * @param {() => void} onContinue - called when the continue button is clicked
 */
export default function RoundOverlay({ show, icon, title, sub, onContinue }) {
  return (
    <div
      className={clsx(
        'fixed inset-0 z-[--z-overlay] items-center justify-center backdrop-blur-[8px]',
        'bg-[rgba(8,10,26,0.72)]',
        show ? 'flex animate-[fade_0.3s_ease]' : 'hidden',
      )}
    >
      <div className="max-w-[420px] rounded-3xl border border-white/10 bg-bg2 px-[50px] py-10 text-center shadow-[--shadow] animate-[pop_0.4s_cubic-bezier(0.22,1.3,0.36,1)]">
        <div className="text-[64px]">{icon}</div>
        <h2 className="mb-1.5 mt-2 text-[26px] font-black">{title}</h2>
        <p className="mb-[22px] mt-0 text-sm text-muted">{sub}</p>
        <button
          className="inline-flex cursor-pointer items-center gap-[7px] rounded-full border-none bg-gradient-to-br from-accent to-[#ffb13d] px-4 py-[9px] text-[13px] font-semibold text-[#2a1d00] shadow-[0_10px_30px_rgba(255,177,61,0.35)] transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
          onClick={onContinue}
          type="button"
        >
          继续
        </button>
      </div>
    </div>
  );
}
