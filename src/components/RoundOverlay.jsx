import React from 'react';

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
    <div className={`overlay${show ? ' show' : ''}`}>
      <div className="panel">
        <div className="big">{icon}</div>
        <h2>{title}</h2>
        <p>{sub}</p>
        <button className="btn primary" onClick={onContinue} type="button">
          继续
        </button>
      </div>
    </div>
  );
}
