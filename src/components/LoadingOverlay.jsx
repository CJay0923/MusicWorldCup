import React from 'react';

/**
 * Full-screen loading overlay with spinner. Dark theme.
 * @param {boolean} visible - whether to show the overlay
 * @param {string} [text] - optional loading text
 */
export default function LoadingOverlay({ visible, text }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[--z-loading] flex items-center justify-center bg-[rgba(10,11,16,0.88)] backdrop-blur-[4px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/8 border-t-[#a78bfa] border-r-[#c4b5fd] shadow-[0_0_16px_rgba(167,139,250,0.45),0_0_32px_rgba(167,139,250,0.18)]" />
        {text && <div className="text-sm tracking-wide text-muted">{text}</div>}
      </div>
    </div>
  );
}
