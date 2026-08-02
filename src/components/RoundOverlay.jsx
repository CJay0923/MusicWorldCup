import React from 'react';
import { clsx } from 'clsx';

/**
 * Round transition overlay. Dark theme.
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
        'fixed inset-0 z-99999 items-center justify-center backdrop-blur-[8px]',
        'bg-[rgba(10,11,16,0.92)]',
        show ? 'flex animate-[fade_0.3s_ease]' : 'hidden',
      )}
    >
      <div className="max-w-[420px] rounded-2xl border border-white/[0.08] bg-bg2 px-12 py-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-[pop_0.4s_cubic-bezier(0.22,1.3,0.36,1)]">
        <div className="text-[64px]">{icon}</div>
        <h2 className="mb-1.5 mt-2 text-[26px] font-black text-ink">{title}</h2>
        <p className="mb-6 mt-0 text-sm text-muted">{sub}</p>
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-accent/60 bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.97]"
          onClick={onContinue}
          type="button"
        >
          继续
        </button>
      </div>
    </div>
  );
}
