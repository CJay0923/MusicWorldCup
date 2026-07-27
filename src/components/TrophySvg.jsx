import React, { useId } from 'react';

/**
 * Trophy SVG icon.
 * @param {number} size - pixel size of the icon (default 104)
 */
export default function TrophySvg({ size = 104 }) {
  // Generate a unique id for the gradient so multiple instances don't clash
  const rawId = useId();
  const gradId = `goldGrad${rawId.replace(/[:]/g, '')}`;

  return (
    <svg
      className="trophy-svg"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}
      aria-label="奖杯"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffeaa0" />
          <stop offset=".5" stopColor="#ffd24a" />
          <stop offset="1" stopColor="#d98e16" />
        </linearGradient>
      </defs>
      <path d="M14 13 C5 13 5 31 16 33" fill="none" stroke={`url(#${gradId})`} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M50 13 C59 13 59 31 48 33" fill="none" stroke={`url(#${gradId})`} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M16 7 H48 V21 C48 34 40 42 32 42 C24 42 16 34 16 21 Z" fill={`url(#${gradId})`} />
      <path d="M22 11 H29 V23 C25 23 22 19 22 14 Z" fill="#ffffff" opacity=".28" />
      <rect x="29" y="42" width="6" height="8" fill={`url(#${gradId})`} />
      <rect x="19" y="50" width="26" height="5" rx="2.2" fill={`url(#${gradId})`} />
      <rect x="23" y="55" width="18" height="4.5" rx="1.8" fill={`url(#${gradId})`} />
    </svg>
  );
}
