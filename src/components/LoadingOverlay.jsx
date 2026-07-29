import React from 'react';

/**
 * Full-screen loading overlay with spinner.
 * Blocks all interactions while data is loading.
 * @param {boolean} visible - whether to show the overlay
 * @param {string} [text] - optional loading text
 */
export default function LoadingOverlay({ visible, text }) {
  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner-wrap">
        <div className="loading-spinner" />
        {text && <div className="loading-text">{text}</div>}
      </div>
    </div>
  );
}
